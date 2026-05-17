# Create Program Feature

## Feature DSL

```yaml
feature: create-program
status: planned
surface: coach-app
route: /programs
primary_actor: coach
parent_feature: program-builder
business_goal:
  - Let a coach create a reusable multi-week training program from existing routines.
  - Keep the first-save flow focused enough that assignment, analytics, and editing can evolve separately.
scope:
  include:
    - Create program entry point from /programs.
    - Empty state create action when no programs exist.
    - Program basics form: title, description, duration in weeks.
    - Routine selection from coach-owned routines.
    - Routine placement as a flexible ordered list.
    - Program review before save.
    - Formik form state for nested routine placements.
    - Zod validation for frontend payload shape.
    - Convex create mutation with server-side authorization and validation.
    - Loading, blocked, validation, saving, success, and error states.
    - Post-create handoff to program detail/edit view and optional assignment entry point.
  exclude:
    - Editing an existing program after first save.
    - Program delete/archive behavior.
    - Program assignment persistence.
    - Trainee program display.
    - Workout logging.
    - Program analytics or progress overview.
    - Program duplication and versioning.
data:
  ownership: coach-owned
  parent_record:
    - programs
  child_records:
    - programRoutines
  read_dependencies:
    - routines
    - routineExerciseBlocks
    - routineSetTargets
  required_fields:
    - title
    - description
    - durationWeeks
    - ownerCoachId
  routine_placement_fields:
    - programId
    - routineId
    - order
    - weekIndex
    - dayIndex
validation:
  title: trimmed, non-empty, max 120
  description: trimmed, max 2000
  durationWeeks: integer from 1 to 52
  routines: at least one routine placement before saving as usable
  routineOwnership: each routineId must belong to the authenticated coach
  routineOrder: deterministic within the selected schedule group
architecture:
  route: src/routes/programs.tsx
  widget: src/widgets/program-builder
  create_feature: src/features/create-program
  program_entity: src/entities/program
  routine_entity: src/entities/routine
  backend: convex/programs.ts
```

## Purpose

Create Program is the first-save workflow inside Program Builder. It turns reusable coach-owned routines into a program template that can later be edited, assigned to trainees, and used by trainee workout flows.

This document is narrower than `docs/features/program-builder.md`: it defines only creation behavior and the implementation contract needed to move from an empty `/programs` placeholder to a working create flow.

## Users

- Coach: creates program templates from routines for future client assignment.
- Trainee: not active in this flow, but later reads assigned programs created here.
- Admin: treated as coach capability for MVP.

## Product Decisions

- Programs are coach-owned records. The client must not send a trusted `ownerCoachId`; Convex derives it from the authenticated user.
- Creating a program depends on existing routines. If no routines exist, the create flow is blocked and links the coach to `/routines`.
- Assignment is a separate feature. After creation, the UI can offer a `Przypisz program` handoff, but it must not implement assignment persistence here.
- Program routines use a flexible ordered list for MVP. This matches current code and keeps the first-save flow simple. Week-based or week-and-day scheduling is later scope unless the product explicitly promotes it.
- Assigned programs as snapshots versus live references is still open. Do not add snapshot/version fields during create-program work unless that decision is resolved.
- Program duplication and versioning are later scope.

## User Stories

### US1: Start Creating a Program

Priority: P1

As a coach, I want to start creating a program from `/programs`, so that I can build a new reusable training template.

Independent test: open `/programs`, use `Dodaj program`, and see the create workspace.

Acceptance:

- GIVEN the coach is authenticated, WHEN `/programs` loads, THEN the page shows a clear `Dodaj program` action.
- GIVEN no programs exist, WHEN the page renders, THEN the empty state explains that programs combine routines into a trainee-ready plan.
- GIVEN the coach starts creation, WHEN the create workspace opens, THEN the basics fields are focused before routine placement.

### US2: Enter Program Basics

Priority: P1

As a coach, I want to define title, description, and duration, so that the program has a clear identity and timeframe.

Independent test: submit invalid and valid basics without touching routine placement.

Acceptance:

- GIVEN the title is empty after trimming, WHEN the coach submits, THEN the title field shows a validation error.
- GIVEN duration is below 1 or above 52, WHEN the coach submits, THEN the duration field shows a validation error.
- GIVEN valid basics are entered, WHEN routine placement is not complete, THEN the basics remain saved in form state and the UI focuses the next unresolved section.

### US3: Add Routines to the Program

Priority: P1

As a coach, I want to choose owned routines and place them in the program structure, so that trainees can follow a planned sequence later.

Independent test: select, reorder, remove, and save routine placements as a flexible ordered list.

Acceptance:

- GIVEN the coach has routines, WHEN the routine picker loads, THEN it lists only routines owned by that coach.
- GIVEN a routine is selected, WHEN it is placed, THEN the placement stores `routineId`, `order`, and the chosen schedule coordinates.
- GIVEN a selected routine becomes unavailable, WHEN the coach tries to save, THEN the placement is shown as invalid and save is blocked.
- GIVEN placements exist in one schedule group, WHEN the coach reorders them, THEN order values remain deterministic.

### US4: Save the Program

Priority: P1

As a coach, I want to save the program once it is valid, so that it appears in my program library.

Independent test: call the create mutation through the UI and verify the new program appears in `/programs`.

Acceptance:

- GIVEN all required fields and routine placements are valid, WHEN the coach saves, THEN Convex creates one `programs` record and related `programRoutines` records.
- GIVEN the save succeeds, WHEN the UI returns to the library or detail state, THEN the created program is visible with title, duration, and routine count.
- GIVEN the save fails, WHEN the error appears, THEN entered form values and placements remain intact.
- GIVEN the signed-in user is not a coach, WHEN the create mutation is called, THEN the mutation rejects the request.

## UX Shape

The create flow should feel like a coach programming workspace, not a dashboard. It can be dense enough for repeated setup, but the first save should stay guided and readable.

Recommended layout:

- Header: `Nowy program`, close/back action, primary save action.
- Basics section: title, description, duration in weeks.
- Routine source: compact searchable routine picker with exercise count and set count.
- Program structure: the flexible ordered routine list.
- Review footer: duration, number of routine placements, unresolved validation count, save state.

Scheduling model:

| Option | Create UI | Stored placement shape | Implementation note |
| --- | --- | --- | --- |
| Week-based | Week panels with ordered routine rows | `weekIndex` plus `order`; `dayIndex` omitted | Fastest MVP and lighter for coach setup |
| Week and day | Week panels containing day slots | `weekIndex`, `dayIndex`, and `order` | More precise, heavier UI and validation |
| Flexible order | One ordered sequence across the duration | `order`; week/day omitted or derived later | Simplest UI, weakest calendar semantics |

Flexible order is the chosen MVP mode. The other modes stay documented only as future alternatives if calendar semantics become necessary.

Required states:

- Loading routines: basics fields remain usable; picker and placement controls show loading.
- No routines: blocked state links to `/routines` and explains that routines are required before creating a usable program.
- Validation errors: inline messages on the exact field or placement, plus summary count in the footer.
- Saving: disable duplicate submit while keeping the form readable.
- Success: show saved program and offer quiet `Przypisz program` handoff.
- Server error: preserve form values and show retry.

## Data Model Plan

The current schema already supports the core create flow:

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
```

Recommended additions before implementation:

- Add `createdAt` and `updatedAt` to `programs` for list sorting and audit clarity.
- Add `by_owner_coach_and_updated_at` if the program list will sort by recent updates.
- Add `by_program_and_week` or a similar index only if week-based or week-and-day scheduling is promoted later and query needs prove it useful.
- Keep routine placements in `programRoutines`. Do not store routine arrays on the `programs` document.

Creation should be transactional:

1. Validate the authenticated user and coach role.
2. Validate basics.
3. Validate each routine exists and belongs to the coach.
4. Validate placement order for the flexible list.
5. Insert `programs`.
6. Insert ordered `programRoutines`.
7. Return the created program id and summary.

## Backend API Plan

Convex module: `convex/programs.ts`

Functions needed for this feature:

- `listCreateOptions`: public query, authenticated coach only, returns bounded routine summaries for the create picker.
- `create`: public mutation, authenticated coach only, validates payload and inserts parent and child records.
- `list`: public query, authenticated coach only, returns enough program summaries for the `/programs` library after save.

MVP payload shape:

```ts
{
  title: string
  description: string
  durationWeeks: number
  placements: Array<{
    routineId: Id<'routines'>
    weekIndex?: number
    dayIndex?: number
    order: number
  }>
}
```

Authorization:

- Use `ctx.auth.getUserIdentity()` and `tokenIdentifier` to find the signed-in user.
- Reject unauthenticated users.
- Reject users whose role is not `coach` or MVP-equivalent admin-as-coach.
- Do not accept `ownerCoachId` from the client.
- Verify every routine in `placements` has `ownerCoachId` matching the authenticated coach.

Convex implementation notes:

- Every public function must have argument validators.
- Use indexes instead of `filter`.
- Keep `listCreateOptions` bounded or paginated.
- Use child rows for placements to avoid unbounded arrays on `programs`.
- Return `null` only intentionally; avoid implicit `undefined`.

## Frontend Architecture

Recommended placement:

- `src/routes/programs.tsx`: route-level binding only.
- `src/widgets/program-builder`: page composition, list/empty state, create workspace placement.
- `src/features/create-program`: Formik setup, validation, submit mapping, create-specific UI.
- `src/entities/program`: program schemas, duration labels, placement validation helpers, payload mappers.
- `src/entities/routine`: routine option types and display summaries for the picker.

Candidate feature-local components:

- `CreateProgramWorkspace`
- `ProgramBasicsFields`
- `RoutinePicker`
- `ProgramPlacementPlanner`
- `CreateProgramFooter`
- `CreateProgramSuccessActions`

Do not move these into `shared/ui` during the first pass. They are domain-specific until reuse proves otherwise.

## Implementation Plan

1. Add program create schemas and placement helpers in `src/entities/program`.
2. Add routine option summary type/helpers in `src/entities/routine` if they do not already exist.
3. Add `createdAt` and `updatedAt` to `programs`; plan a dev-data backfill if existing rows are present.
4. Add `convex/programs.ts` with `listCreateOptions`, `create`, and `list`.
5. Add Convex tests for create validation, routine ownership, and role authorization where project test setup allows.
6. Add `src/features/create-program` with Formik and Zod-backed validation.
7. Add the flexible ordered `ProgramPlacementPlanner` UI.
8. Add `src/widgets/program-builder` with empty state, list shell, and create workspace.
9. Replace the placeholder `/programs` route with the widget.
10. Verify with Convex codegen/checks, typecheck, tests, build, and browser checks for `/programs`.

## Acceptance Criteria

- Coach can open `/programs` and start `Dodaj program`.
- If no routines exist, the create flow is blocked with a clear link to `/routines`.
- Coach can enter title, description, and duration in weeks.
- Title and duration validation is shown inline.
- Coach can select only owned routines.
- Coach can place at least one routine in the flexible ordered list.
- Routine placements preserve deterministic order.
- Save creates one program and its routine placements in Convex.
- Created program appears in the coach's program library after save.
- Save error preserves all entered values.
- Unauthenticated users cannot create programs.
- Trainee users cannot create programs.
- A coach cannot attach another coach's routine.
- The created program offers a non-blocking handoff to assignment without implementing assignment persistence here.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex create mutation: valid minimum payload.
- Convex create mutation: reject empty title, invalid duration, empty placements, invalid routine id, and routine owned by another coach.
- Authorization: reject unauthenticated user, trainee user, and coach using another coach's routine.
- Browser desktop: `/programs` empty/list/create states render without layout overlap.
- Browser mobile: create form fields and routine placement controls remain readable and touch-friendly.
- Error state: failed save preserves form state and enables retry.

## Open Follow-Ups

- Decide whether assignment uses live program references or trainee-specific snapshots.
- Decide whether empty programs can be saved as drafts or whether at least one routine placement is mandatory.
- Add a focused edit-program document if editing behavior diverges from first creation.
- Add program duplication/versioning only after assignment behavior makes its requirements clear.
