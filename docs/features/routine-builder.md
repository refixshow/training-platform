# Routine Builder Feature

## Feature DSL

```yaml
feature: routine-builder
status: planned
surface: coach-app
route: /routines
primary_actor: coach
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Let coaches compose reusable training routines from the exercise library.
  - Capture typed set targets so programs and trainee workout logging can use the same source structure.
scope:
  include:
    - Routine list shell.
    - Routine detail or editor workspace.
    - Empty state with create action.
    - Create routine form.
    - Edit routine form.
    - Delete only when safe or blocked with an explanation.
    - Exercise picker backed by the exercise library.
    - Ordered exercise blocks.
    - Per-exercise set target editor.
    - Per-set fields driven by exercise type.
    - Target RPE.
    - Rest duration.
    - Optional superset relationship.
    - Formik form state for the builder.
    - Zod validation for frontend payload shape.
    - Convex create, update, get, list, and guarded remove mutations/queries.
    - Loading, saving, validation, empty, error, disabled, and success states.
  exclude:
    - Drag-and-drop ordering.
    - Routine templates.
    - Warm-up sets.
    - Tempo fields.
    - Coach-only programming notes.
    - Program week/day scheduling.
    - Program assignment.
    - Trainee workout logging.
data:
  ownership: coach-owned
  parent_record:
    - routines
  child_records:
    - routineExerciseBlocks
    - routineSetTargets
  required_fields:
    - name
    - ownerCoachId
    - at least one exercise block before publishing/saving as usable
    - at least one set target per exercise block
  optional_fields:
    - restSeconds
    - supersetGroup
    - targetRpe
    - weightKg
    - reps
    - repsMin
    - repsMax
    - durationSeconds
    - distanceMeters
validation:
  name: trimmed, non-empty, max 120
  exercise_blocks: ordered, no orphan blocks, exerciseId must exist
  set_targets: ordered by setIndex, fields must match selected exercise type
  targetRpe: optional number from 1 to 10
  restSeconds: optional non-negative integer
  supersets: optional stable group key across two or more adjacent blocks
architecture:
  route: src/routes/routines.tsx
  widget: src/widgets/routine-builder
  create_feature: src/features/create-routine
  edit_feature: src/features/edit-routine
  routine_entity: src/entities/routine
  exercise_entity: src/entities/exercise
  backend: convex/routines.ts
```

## Product Decisions

- Routines are coach-owned records in MVP. The current schema already models `ownerCoachId`, and Convex functions should enforce that boundary.
- A routine is a reusable training unit, not a scheduled program entry. Program Builder uses a flexible ordered routine list for MVP; week/day scheduling is later scope.
- Routine set fields are driven by exercise type. The builder must not show irrelevant target fields for a selected exercise.
- Supersets are optional in MVP. They can be represented as a lightweight group key on exercise blocks, with UI kept simple enough to replace later.
- Physical delete should be conservative. If a routine is referenced by programs or training results, block deletion and explain why. A future archive state can be added if the product wants routine retirement.
- Drag-and-drop ordering is later scope. MVP can use explicit move up/down controls or numeric order controls that stay accessible.

## UX Shape

The `/routines` page should be a practical coach programming workspace. It should be denser than trainee screens, but still built for repeated editing without dashboard noise.

Primary layout:

- Page header: `Rutyny`, short operational description, primary `Dodaj rutyne` action.
- Toolbar: search by routine name and optional filters for updated status or exercise count.
- Content: dense list/table of routines with name, exercise count, set count, last updated, and program usage when available.
- Empty state: explain that routines are built from exercises and later attached to programs, with one `Dodaj rutyne` action.
- Builder flow: full-page or wide inline workspace. Avoid modal-first design because routine editing has nested, repeated fields.

Builder sections:

- Basics: routine name.
- Exercise blocks: ordered blocks with exercise selector, exercise type metadata, rest duration, optional superset control, and remove action.
- Set targets: per-block set rows with fields matched to the selected exercise type.
- Summary rail or footer: total exercises, total working sets, unresolved validation issues, save action.

Set target UI by exercise type:

| Exercise type | Required target fields | Optional target fields |
| --- | --- | --- |
| Weight and reps | weight or blank target, reps or rep range | target RPE |
| Reps only | reps or rep range | target RPE |
| Bodyweight | reps or rep range | target RPE |
| Assisted bodyweight | assistance weight, reps or rep range | target RPE |
| Duration | duration | target RPE |
| Weight and duration | weight, duration | target RPE |
| Distance and duration | distance, duration | target RPE |
| Weight and distance | weight, distance | target RPE |

Empty and error states matter here:

- No exercises exist: show a blocked builder state linking the coach to `/exercises`.
- Exercise picker loading: keep existing routine fields visible and disable only the picker.
- Selected exercise was deleted or unavailable: show an inline block error and prevent save until replaced or removed.
- Save error: preserve all entered values and show a focused retry path.

## Data Model Plan

Current `convex/schema.ts` already contains the right core split:

```ts
routines: defineTable({
  name: v.string(),
  ownerCoachId: v.id('users'),
}).index('by_owner_coach', ['ownerCoachId'])

routineExerciseBlocks: defineTable({
  exerciseId: v.id('exercises'),
  order: v.number(),
  restSeconds: v.optional(v.number()),
  routineId: v.id('routines'),
  supersetGroup: v.optional(v.string()),
})
  .index('by_exercise', ['exerciseId'])
  .index('by_routine', ['routineId'])

routineSetTargets: defineTable({
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  reps: v.optional(v.number()),
  repsMax: v.optional(v.number()),
  repsMin: v.optional(v.number()),
  routineExerciseBlockId: v.id('routineExerciseBlocks'),
  setIndex: v.number(),
  targetRpe: v.optional(v.number()),
  weightKg: v.optional(v.number()),
}).index('by_routine_exercise_block', ['routineExerciseBlockId'])
```

Recommended schema tightening:

- Add `createdAt` and `updatedAt` to `routines`.
- Consider `updatedAt` on `routineExerciseBlocks` only if block-level audit becomes useful; otherwise parent `updatedAt` is enough for list sorting.
- Add `by_owner_coach_and_name` if duplicate prevention or name search needs indexed lookup.
- Add `by_owner_coach_and_updated_at` only if list sorting by updated date becomes a real query requirement.
- Keep blocks and set targets in child tables. Do not move them into arrays on `routines`.

Set target validation should live in shared helper logic used by create and update mutations:

- `weight-and-reps`: allow `weightKg` plus either `reps` or `repsMin` and `repsMax`.
- `reps-only` and `bodyweight`: allow reps fields, reject weight/duration/distance.
- `assisted-bodyweight`: allow `weightKg` as assistance load plus reps fields.
- `duration`: require `durationSeconds`, reject weight/reps/distance.
- `weight-and-duration`: require `weightKg` and `durationSeconds`.
- `distance-and-duration`: require `distanceMeters` and `durationSeconds`.
- `weight-and-distance`: require `weightKg` and `distanceMeters`.

Notes:

- Convex mutations should load referenced exercises to validate target fields against each exercise type.
- List queries should be bounded or paginated. Do not return every routine indefinitely.
- Updating a routine should replace its child blocks and set targets transactionally for MVP simplicity, as long as the expected routine size stays within Convex mutation limits.
- If routines grow large enough to hit transaction limits, move to batched child updates with explicit versioning.

## Backend API Plan

Convex module: `convex/routines.ts`

Functions:

- `list`: public query, authenticated coach only, bounded by owner coach, returns routine rows with derived exercise and set counts.
- `get`: public query, authenticated coach only, returns routine with ordered blocks, set targets, and exercise metadata needed by the editor.
- `create`: public mutation, authenticated coach only, validates payload, referenced exercises, and set target fields, then inserts parent and child records.
- `update`: public mutation, authenticated owner coach only, validates payload, replaces or patches child structure, updates parent timestamp.
- `remove`: public mutation, authenticated owner coach only, blocks when `programRoutines` or `trainingResults` reference the routine.

Authorization:

- Coach can list and manage only routines where `ownerCoachId` matches their user id.
- Trainee cannot create, edit, delete, or list coach routine library records.
- Future admin split should be isolated behind an authorization helper instead of route-only checks.
- Program Builder may read coach-owned routines through a focused query that still derives coach identity server-side.

Reference checks:

- Program usage can use `programRoutines.by_routine`.
- Submitted result usage can use `trainingResults.by_routine`.
- Exercise deletion should be blocked or constrained separately if any `routineExerciseBlocks.by_exercise` row exists.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/routine`: routine types, labels, Zod schemas, set target helpers, and display utilities that multiple routine/program/training features can reuse.
- `entities/exercise`: exercise type labels and field capability helpers already needed by exercise library and routine builder.
- `features/create-routine`: create form shell, Formik setup, submit mapping, and first-save behavior.
- `features/edit-routine`: routine editor behavior for existing routines, including block and set operations.
- `widgets/routine-builder`: page composition, list, toolbar, empty state, editor placement, and summary.
- `src/routes/routines.tsx`: route-level binding only.

Do not move builder-only controls into `shared/ui` during the first pass. Candidate feature-local components:

- `RoutineExerciseBlockEditor`
- `SetTargetEditor`
- `ExercisePicker`
- `SupersetControl`
- `RoutineBuilderSummary`

Move a component into `shared/ui` only after a generic interaction clearly repeats outside routines, and confirm ambiguous shared boundaries with the programmer.

## Implementation Plan

1. Add routine constants, set target schemas, and exercise-type field helpers in `src/entities/routine`.
2. Add backend payload validators and helper validation in `convex/routines.ts`.
3. Add `list`, `get`, `create`, `update`, and guarded `remove` functions.
4. Add timestamp fields and any needed indexes to `convex/schema.ts`; decide whether existing dev data needs a backfill.
5. Add focused Convex tests for create/update validation and authorization where project test setup allows.
6. Add `features/create-routine` with Formik, Zod validation, and minimum one exercise block workflow.
7. Add `features/edit-routine` for ordered block editing, set target editing, rest duration, and supersets.
8. Add `widgets/routine-builder` with list, empty state, loading/error states, and builder workspace.
9. Replace placeholder `/routines` route with the routine builder widget.
10. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser sanity checks for `/routines`.

## Acceptance Criteria

- Coach can open `/routines`.
- Empty routine library shows a clear empty state and one `Dodaj rutyne` action.
- Coach can create a routine with a name, at least one exercise, and valid set targets.
- Exercise blocks stay ordered and can be reordered without drag-and-drop.
- Set target fields change when the selected exercise type changes.
- Invalid target combinations are rejected before save and again in Convex.
- Target RPE accepts only values from 1 to 10 when provided.
- Rest duration is optional and stored in seconds.
- Superset grouping can be added without making it mandatory.
- Created routine appears in the list after save.
- Coach can edit an owned routine and see updated blocks and targets.
- Deleting an unreferenced routine succeeds.
- Deleting a routine referenced by a program or training result is blocked with a clear explanation.
- Loading and saving states are visible and stable.
- Convex functions derive identity server-side and enforce coach ownership.
- Trainee or unauthenticated user cannot manage routines.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex create mutation: valid minimum payload.
- Convex update mutation: add, remove, and reorder exercise blocks.
- Convex validation: reject missing routine name, empty blocks, empty set targets, invalid RPE, and mismatched target fields by exercise type.
- Authorization: unauthenticated user cannot query/mutate; trainee cannot mutate; coach cannot edit another coach's routine.
- Delete guard: block when referenced by `programRoutines` or `trainingResults`.
- Browser: `/routines` renders list/empty states and create/edit builder on mobile and desktop.

## Open Follow-Ups

- Program scheduling is flexible ordered routine placement for MVP. Week/day attachment is later scope unless explicitly promoted.
- Routine templates are later scope and should not shape the MVP data model beyond keeping routines reusable.
- Warm-up sets, tempo, and coach-only notes need separate product decisions before becoming required builder fields.
- If routine sizes become large, child record replacement during update may need a batched or diff-based mutation strategy.
