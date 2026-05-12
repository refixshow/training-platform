# Program Assignment Feature

## Feature DSL

```yaml
feature: program-assignment
status: planned
surface: coach-app
route: /assignments
primary_actor: coach
secondary_actor: trainee
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Let coaches assign prepared training programs to managed trainees.
  - Give trainees access only to their own assigned programs and routines.
scope:
  include:
    - Assignment list shell.
    - Empty state with assign action.
    - Assign program form.
    - Program selector.
    - Trainee selector limited to coach-managed trainees.
    - Assignment confirmation state.
    - Assignment list grouped or filterable by client and program.
    - Guarded unassign/remove action when no submitted training depends on the assignment.
    - Trainee-facing assigned program query contract.
    - Formik form state for assignment form.
    - Zod validation for frontend payload shape.
    - Convex list, assign, unassign, and trainee-owned read queries/mutations.
    - Loading, saving, validation, empty, error, disabled, and success states.
  include_as_integration:
    - Optional preselected program when arriving from /programs.
    - Optional client filter when arriving from a future client detail page.
  exclude:
    - Program builder.
    - Routine builder.
    - Trainee workout logging implementation.
    - Program snapshot/versioning implementation until decision is made.
    - Coach comments on assignments.
    - Notifications.
    - Calendar integrations.
data:
  ownership: coach-managed
  parent_records:
    - programs
    - users
  owned_records:
    - programAssignments
  related_records:
    - trainingResults
    - activities
  required_fields:
    - programId
    - traineeId
    - coachId
    - assignedAt
  optional_fields:
    - startsAt
    - endsAt
    - status
    - snapshotVersionId
validation:
  programId: program must exist and belong to the coach
  traineeId: trainee must exist and be managed by the coach
  duplicate_guard: active duplicate assignment for same trainee and program should be rejected or clearly handled
  assignedAt: server-generated timestamp
architecture:
  route: src/routes/assignments.tsx
  widget: src/widgets/program-assignment
  assign_feature: src/features/assign-program
  unassign_feature: src/features/unassign-program
  program_entity: src/entities/program
  user_entity: src/entities/user
  backend: convex/programAssignments.ts
  program_backend: convex/programs.ts
```

## Product Decisions

- Program assignment is an MVP feature and should be separate from Program Builder. The builder can hand off to `/assignments`, but assignment has its own authorization, list, and lifecycle.
- For MVP, admin capabilities are handled by the coach role. Do not introduce a separate admin surface for assignment.
- A coach may assign only programs they own to trainees they are allowed to manage.
- Trainees may read only their own assigned programs through trainee-specific Convex queries.
- Assignment persistence depends on the unresolved product decision: assigned programs as live references or trainee-specific snapshots. Do not implement the final persistence shape until this is confirmed.
- Unassign should be conservative. If submitted training results reference the assigned program, block destructive removal or switch to a non-destructive inactive state.

## UX Shape

The `/assignments` page should be a coach operations screen: compact, searchable, and clear about who has which program. It should support repeated assignment work without becoming a dashboard.

Primary layout:

- Page header: `Przypisania`, short operational description, primary `Przypisz program` action.
- Toolbar: search by trainee name or program title, filter by program, filter by assignment status once statuses exist.
- Content: dense list/table with trainee, program, assigned date, program duration, current status, and available actions.
- Empty state: explain that assignments connect programs to trainees, with one `Przypisz program` action.
- Assign flow: inline panel or page-level form. Avoid modal-first design if the coach needs to compare programs and trainees while assigning.

Assign form sections:

- Program: select one coach-owned program, showing title, duration, routine count, and warning if program has no routine placements.
- Trainee: select one managed trainee, showing name, email, and current active assignment count when available.
- Review: concise confirmation showing `Program -> Trainee`, duration, and assignment behavior once snapshot/live is decided.
- Submit: disabled until both program and trainee are valid.

Trainee-facing contract:

- Trainee sees assigned programs in a simple mobile-first list.
- Each assigned program should expose enough structure for the training flow to find the current routine.
- Trainee queries must not expose other trainees, coach program library metadata, or assignments belonging to another user.

Empty and error states:

- No programs exist: show a blocked assignment state linking to `/programs`.
- Program has no routines: allow only if product explicitly accepts empty assignments; otherwise block with explanation.
- No managed trainees exist: show a blocked assignment state linking to future client/user management.
- Duplicate active assignment: show a clear message and link/focus the existing assignment.
- Save error: preserve selected program and trainee and show a retry path.
- Unassign blocked by submitted results: explain that history exists and suggest deactivation/archive once available.

## Data Model Plan

Current `convex/schema.ts` already includes basic assignment storage:

```ts
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

- Add `by_program` before program delete guards or assignment counts.
- Add `by_trainee_and_program` for duplicate detection and trainee-specific program lookup.
- Consider `status` with values such as `active`, `inactive`, and `completed` if unassign should preserve history.
- Consider `startsAt` and `endsAt` only when scheduling behavior is needed; do not add date semantics just for decoration.
- Add `snapshotVersionId` or related snapshot fields only after the snapshot-vs-live decision is made.

Live reference option:

- `programAssignments.programId` points to the coach-owned program template.
- Trainees see changes when the coach edits the original program.
- Simpler MVP, but risky if edits should not rewrite an active trainee plan.

Snapshot option:

- Assignment creates a trainee-specific copy or version record of the program and routine structure.
- Trainees keep stable assigned content even when the coach edits the template.
- More durable coaching behavior, but requires additional schema and migration/versioning work.

Do not choose between these in implementation without programmer confirmation.

## Backend API Plan

Convex module: `convex/programAssignments.ts`

Functions:

- `listByCoach`: public query, authenticated coach only, bounded by coach id, returns assignments with trainee and program summary data.
- `assign`: public mutation, authenticated coach only, derives coach identity server-side, validates program ownership, validates trainee relationship, checks duplicate active assignment, writes assignment.
- `unassign`: public mutation, authenticated coach only, validates assignment ownership, blocks or deactivates when training results exist.
- `listForTrainee`: public query, authenticated trainee only, returns only the signed-in trainee's assigned programs.
- `getAssignedProgramForTraining`: public query or focused helper for trainee training flow once workout logging is implemented.

Supporting backend needs:

- `convex/programs.ts` should expose a coach-owned program summary query for selectors.
- A user/client query should expose only coach-managed trainees for the assignment form.
- Training result queries should treat `programId` as optional historical context but enforce trainee ownership.

Authorization:

- Never accept `coachId` as a trusted client argument for assignment writes.
- Derive the authenticated user from Convex Auth and load the user by token identifier.
- Coach can assign only if `program.ownerCoachId` matches coach id.
- Coach can assign only to users whose `coachId` matches coach id and whose role is `trainee`.
- Trainee can read only assignments where `traineeId` is their own user id.
- Unauthenticated users cannot read or mutate assignments.

Reference checks:

- Duplicate assignment should use an indexed lookup, ideally `by_trainee_and_program`.
- Delete/unassign guard should check `trainingResults` by trainee and program context. If this cannot be indexed efficiently with the current schema, prefer a non-destructive status over physical deletion.
- Program delete guards should use `programAssignments.by_program` once added.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/program`: assignment-facing program summaries, duration labels, and selector option helpers.
- `entities/user`: trainee option types and display helpers.
- `features/assign-program`: Formik form, validation mapping, submit behavior, duplicate handling, success confirmation.
- `features/unassign-program`: guarded action, confirmation copy, blocked state handling.
- `widgets/program-assignment`: page composition, toolbar, list/table, empty states, assignment panel, and error boundaries.
- `src/routes/assignments.tsx`: route-level binding only.

Do not move assignment-specific selector or table controls into `shared/ui` during the first pass. Candidate feature-local components:

- `ProgramAssignmentForm`
- `ProgramAssignmentList`
- `ProgramAssignmentToolbar`
- `ProgramSelector`
- `ManagedTraineeSelector`
- `AssignmentStatusBadge`

Move generic pieces into `shared/ui` only after repeated use proves they are not assignment-specific, and confirm ambiguous shared boundaries with the programmer.

## Implementation Plan

1. Confirm assigned program persistence: live template reference or trainee-specific snapshot.
2. Decide whether MVP needs assignment status or only physical assignment rows.
3. Add assignment schemas and display helpers in `src/entities/program` or a focused assignment model if reuse justifies it.
4. Add managed trainee selector query in the appropriate Convex users module.
5. Add `convex/programAssignments.ts` with `listByCoach`, `assign`, `unassign`, and `listForTrainee`.
6. Add required indexes to `convex/schema.ts`, especially duplicate and by-program lookup indexes.
7. Add focused Convex tests for assignment validation, duplicate prevention, trainee read isolation, and coach ownership.
8. Add `features/assign-program` with Formik, Zod validation, and server error handling.
9. Add `features/unassign-program` only after the destructive/non-destructive behavior is decided.
10. Add `widgets/program-assignment` with list, filters, empty states, blocked states, and assign panel.
11. Replace placeholder `/assignments` route with the assignment widget.
12. Add optional route/search-param support for a preselected program from `/programs`.
13. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser sanity checks for `/assignments`.

## Acceptance Criteria

- Coach can open `/assignments`.
- Empty assignments show a clear empty state and one `Przypisz program` action.
- Coach can select one owned program and one managed trainee.
- Assignment form blocks submission when no program or trainee is selected.
- Assignment form blocks or warns when the selected program has no routine placements.
- Coach cannot assign a program owned by another coach.
- Coach cannot assign to a trainee they do not manage.
- Duplicate active assignment for the same trainee and program is rejected or handled explicitly.
- Created assignment appears in the list after save.
- Assignment list is filterable or searchable by trainee and program.
- Trainee-specific query returns only the signed-in trainee's assigned programs.
- Unassign is blocked or made non-destructive when submitted training history exists.
- Loading and saving states are visible and stable.
- Convex functions derive identity server-side and enforce coach/trainee ownership.
- Unauthenticated users cannot read or mutate assignments.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex assign mutation: valid coach-owned program to managed trainee.
- Convex validation: reject missing program, missing trainee, invalid role, duplicate active assignment.
- Authorization: unauthenticated user cannot query/mutate; trainee cannot assign; coach cannot assign another coach's program.
- Trainee query isolation: trainee sees own assignments only.
- Unassign guard: block or deactivate when training results exist, based on final lifecycle decision.
- Browser: `/assignments` renders list/empty states and assign flow on mobile and desktop.
- Integration: arriving from `/programs` can preselect a program when route search support is implemented.

## Open Follow-Ups

- Decide whether assigned programs are snapshots or live references to program templates.
- Decide whether assignments need `status`, `startsAt`, or `endsAt` in MVP.
- Decide whether unassign is physical delete, inactive state, or archive once training history exists.
- Program assignment should feed trainee workout logging, but logging itself belongs to a separate feature document.
- Future client management docs should define how coaches create/invite/manage trainees before assignment.
