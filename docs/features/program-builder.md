# Program Builder Feature

## Feature DSL

```yaml
feature: program-builder
status: planned
surface: coach-app
route: /programs
primary_actor: coach
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Let coaches build multi-week training programs from reusable routines.
  - Give trainees a clear assigned structure for current and upcoming training.
scope:
  include:
    - Program list shell.
    - Program detail or editor workspace.
    - Empty state with create action.
    - Create program form.
    - Edit program form.
    - Delete only when safe or blocked with an explanation.
    - Program title and description.
    - Program duration in weeks.
    - Routine attachment to program structure.
    - Routine ordering within the selected schedule structure.
    - Formik form state for the builder.
    - Zod validation for frontend payload shape.
    - Convex create, update, get, list, and guarded remove mutations/queries.
    - Loading, saving, validation, empty, error, disabled, and success states.
  include_as_integration:
    - Assignment handoff from program detail to /assignments.
    - Program usage count in coach list when low risk.
  exclude:
    - Full program assignment workflow.
    - Assigned-program snapshot implementation.
    - Trainee training flow.
    - Program calendar view.
    - Program duplication.
    - Program versioning.
    - Program progress overview.
    - Advanced adherence analytics.
data:
  ownership: coach-owned
  parent_record:
    - programs
  child_records:
    - programRoutines
  related_records:
    - programAssignments
    - trainingResults
  required_fields:
    - title
    - description
    - durationWeeks
    - ownerCoachId
  optional_fields:
    - weekIndex
    - dayIndex
    - order
validation:
  title: trimmed, non-empty, max 120
  description: trimmed, max 2000
  durationWeeks: integer from 1 to 52
  routine_links: routineId must exist and belong to the coach
  ordering: deterministic within each selected week/day/flexible group
architecture:
  route: src/routes/programs.tsx
  assignment_route: src/routes/assignments.tsx
  widget: src/widgets/program-builder
  create_feature: src/features/create-program
  edit_feature: src/features/edit-program
  assign_feature: src/features/assign-program
  program_entity: src/entities/program
  routine_entity: src/entities/routine
  user_entity: src/entities/user
  backend: convex/programs.ts
  assignment_backend: convex/programAssignments.ts
```

## Product Decisions

- Programs are coach-owned records in MVP. Convex functions must enforce `ownerCoachId`, not trust route or client state.
- Program Builder depends on Routine Builder. If no routines exist, the builder should show a blocked state that links to `/routines`.
- Program assignment is part of the MVP product scope, but it can be implemented as a connected feature on `/assignments` rather than fully inside the `/programs` editor.
- Exact routine scheduling inside a program is still an open product decision. Do not silently choose day-based, week-based, or flexible ordering during implementation.
- Whether assigned programs are copied into a trainee-specific snapshot or stay linked to the template is still an open product decision. Do not implement assignment persistence until this is confirmed.
- Physical delete should be conservative. If a program is assigned or referenced by training results, block deletion and explain why. A future archive state can be added if the product wants program retirement.

## UX Shape

The `/programs` page should feel like a coach programming workspace: structured, scannable, and fast for repeated setup. It should not become an analytics dashboard.

Primary layout:

- Page header: `Programy`, short operational description, primary `Dodaj program` action.
- Toolbar: search by title, optional status/usage filter after statuses exist.
- Content: dense list/table of programs with title, duration, routine count, assignment count when available, and last updated.
- Empty state: explain that programs combine routines into a trainee-ready plan, with one `Dodaj program` action.
- Builder flow: full-page or wide inline workspace. Avoid modal-first design because program editing spans multiple weeks and routines.

Builder sections:

- Basics: title, description, duration in weeks.
- Routine library side panel or picker: coach-owned routines with exercise/set summary.
- Program structure: slots where routines are attached and ordered.
- Summary rail or footer: total weeks, total routine placements, unresolved validation issues, save action.
- Assignment handoff: after save, offer a quiet `Przypisz program` action that navigates to `/assignments` with the program preselected when routing supports it.

Scheduling UI must wait for a product decision:

| Scheduling option | UX shape | Tradeoff |
| --- | --- | --- |
| Week-based | Each week contains an ordered routine list | Fastest MVP, but less precise for exact training days |
| Week and day | Each week contains day slots | Clear for calendar-like plans, but heavier to edit |
| Flexible order | Program is an ordered sequence across the full duration | Simple for trainee flow, but less calendar-specific |

Until that decision is made, design and implementation should keep `programRoutines.weekIndex`, `dayIndex`, and `order` flexible enough to support the chosen mode without data loss.

Empty and error states:

- No routines exist: show a blocked builder state linking the coach to `/routines`.
- Routine picker loading: keep entered program basics visible and disable only routine attachment.
- Selected routine was deleted or unavailable: show an inline placement error and prevent save until replaced or removed.
- Duration shortened below existing placements: require confirmation or move affected placements into a visible invalid state before save.
- Save error: preserve entered values and show a focused retry path.

## Data Model Plan

Current `convex/schema.ts` already contains the core program split:

```ts
programs: defineTable({
  description: v.string(),
  durationWeeks: v.number(),
  ownerCoachId: v.id('users'),
  title: v.string(),
}).index('by_owner_coach', ['ownerCoachId'])

programRoutines: defineTable({
  dayIndex: v.optional(v.number()),
  order: v.number(),
  programId: v.id('programs'),
  routineId: v.id('routines'),
  weekIndex: v.optional(v.number()),
})
  .index('by_program', ['programId'])
  .index('by_routine', ['routineId'])

programAssignments: defineTable({
  assignedAt: v.number(),
  coachId: v.id('users'),
  programId: v.id('programs'),
  traineeId: v.id('users'),
})
  .index('by_coach', ['coachId'])
  .index('by_trainee', ['traineeId'])
```

Recommended schema tightening:

- Add `createdAt` and `updatedAt` to `programs`.
- Add `by_owner_coach_and_title` if duplicate prevention or title lookup needs indexed support.
- Add `by_program_and_week` only after the scheduling mode is chosen and query needs are clear.
- Consider `programAssignments.by_program` before showing assignment counts or delete guards by assigned program.
- Consider `programAssignments.by_trainee_and_program` before enforcing duplicate assignment prevention efficiently.
- Keep routine placements in `programRoutines`. Do not store an unbounded array of routine placements inside `programs`.

Assignment data model is intentionally not finalized here:

- Live-template assignment means trainees see updates to the original program unless additional versioning is added.
- Snapshot assignment means assignment creates trainee-specific copies or serialized routine/program structure.
- This must be confirmed before implementing `/assignments` persistence or trainee program reads.

## Backend API Plan

Convex module: `convex/programs.ts`

Functions:

- `list`: public query, authenticated coach only, bounded by owner coach, returns program rows with derived routine placement counts and optional assignment counts.
- `get`: public query, authenticated owner coach only, returns program with ordered routine placements and routine metadata needed by the editor.
- `create`: public mutation, authenticated coach only, validates payload, referenced routines, duration, and placement ordering, then inserts parent and child records.
- `update`: public mutation, authenticated owner coach only, validates payload, replaces or patches routine placements, updates parent timestamp.
- `remove`: public mutation, authenticated owner coach only, blocks when `programAssignments` or `trainingResults` reference the program.

Convex module: `convex/programAssignments.ts`

Likely follow-up functions after snapshot/live decision:

- `listByCoach`: coach view of assignments.
- `assign`: authenticated coach only, validates coach owns program and is allowed to manage trainee.
- `unassign`: authenticated coach only, guarded by assignment ownership and training history rules.
- `listForTrainee`: authenticated trainee only, returns only their assigned programs.

Authorization:

- Coach can list and manage only programs where `ownerCoachId` matches their user id.
- Coach can attach only routines they own.
- Coach can assign only to trainees they are allowed to manage.
- Trainee can read only assigned programs through trainee-specific queries, not the coach program library query.
- Future admin split should be isolated behind authorization helpers instead of route-only checks.

Reference checks:

- Routine placement validation should use `routines.by_owner_coach` or direct routine reads plus ownership checks.
- Delete guard should check `programAssignments` and `trainingResults.programId`.
- If assignment counts are displayed, add an index that avoids unbounded scans by program.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/program`: program types, labels, Zod schemas, duration helpers, placement helpers, and display utilities.
- `entities/routine`: routine option types and summary helpers needed by the program routine picker.
- `entities/user`: trainee option types only when implementing assignment flow.
- `features/create-program`: create form shell, Formik setup, submit mapping, first-save behavior.
- `features/edit-program`: program editor behavior for existing programs, including placement operations.
- `features/assign-program`: assignment form and submit behavior when the assignment workflow is implemented.
- `widgets/program-builder`: page composition, list, toolbar, empty state, editor placement, and save/assign handoff.
- `widgets/program-assignment`: page composition for `/assignments` if assignment grows beyond a simple form.
- `src/routes/programs.tsx`: route-level binding only.
- `src/routes/assignments.tsx`: assignment route binding when implemented.

Do not move program planner controls into `shared/ui` in the first pass. Candidate feature-local components:

- `ProgramRoutinePicker`
- `ProgramPlacementGrid`
- `ProgramWeekPlanner`
- `ProgramFlexibleSequence`
- `ProgramBuilderSummary`
- `ProgramAssignmentPrompt`

Move generic pieces into `shared/ui` only after repeated use proves they are not program-specific, and confirm ambiguous shared boundaries with the programmer.

## Implementation Plan

1. Confirm the scheduling mode for routine placement: week-based, week-and-day, or flexible order.
2. Confirm assignment persistence: live template reference or trainee-specific snapshot.
3. Add program constants, schemas, and placement helpers in `src/entities/program`.
4. Add backend payload validators and helper validation in `convex/programs.ts`.
5. Add `list`, `get`, `create`, `update`, and guarded `remove` functions.
6. Add timestamp fields and required indexes to `convex/schema.ts`; decide whether existing dev data needs a backfill.
7. Add focused Convex tests for create/update validation and authorization where project test setup allows.
8. Add `features/create-program` with Formik, Zod validation, and minimum program basics flow.
9. Add `features/edit-program` for routine placement editing based on the chosen schedule mode.
10. Add `widgets/program-builder` with list, empty state, loading/error states, and builder workspace.
11. Replace placeholder `/programs` route with the program builder widget.
12. Implement `/assignments` as a separate follow-up once assignment persistence is confirmed.
13. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser sanity checks for `/programs`.

## Acceptance Criteria

- Coach can open `/programs`.
- Empty program library shows a clear empty state and one `Dodaj program` action.
- Coach can create a program with title, description, and duration in weeks.
- Program duration accepts only a valid integer range.
- Coach can attach owned routines to the chosen program schedule structure.
- Routine placements stay ordered deterministically.
- Coach cannot attach another coach's routine.
- Invalid or deleted routine placements are shown inline and block save until fixed.
- Created program appears in the list after save.
- Coach can edit an owned program and see updated routine placements.
- Deleting an unreferenced program succeeds.
- Deleting an assigned or result-referenced program is blocked with a clear explanation.
- Saved program offers a clear handoff to assignment without forcing assignment in the same editor.
- Loading and saving states are visible and stable.
- Convex functions derive identity server-side and enforce coach ownership.
- Trainee or unauthenticated user cannot manage program templates.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex create mutation: valid minimum payload.
- Convex update mutation: add, remove, and reorder routine placements.
- Convex validation: reject missing title, invalid duration, invalid routine id, and routine owned by another coach.
- Authorization: unauthenticated user cannot query/mutate; trainee cannot mutate; coach cannot edit another coach's program.
- Delete guard: block when referenced by `programAssignments` or `trainingResults`.
- Browser: `/programs` renders list/empty states and create/edit builder on mobile and desktop.
- Assignment handoff: saved program can navigate to `/assignments` or expose the intended next step without data loss.

## Open Follow-Ups

- Decide whether routines are scheduled by day, week, or flexible order inside a program.
- Decide whether assigned programs are snapshots or live references to program templates.
- Program assignment deserves a focused implementation doc once the snapshot/live decision is resolved.
- Program duplication and versioning are later scope, but the assignment decision may make versioning more important.
- Program progress overview should wait until training results and statistics are implemented.
