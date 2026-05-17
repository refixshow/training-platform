# Trainee Program View Feature

## Feature DSL

```yaml
feature: trainee-program-view
status: planned
surface: trainee-app
route: /my-program
primary_actor: trainee
supporting_actor: coach
business_goal:
  - Let trainees understand their assigned training program without coach-side complexity.
  - Provide a stable entry point into current routines and future workout logging.
scope:
  include:
    - Assigned program list or current program shell.
    - Assigned program detail page.
    - Program title, description, duration, and assignment metadata.
    - Routine schedule/sequence display based on the chosen program structure.
    - Routine detail preview with exercises, set targets, RPE, rest, instructions, and media links.
    - Current/next routine affordance for trainee training flow.
    - Trainee-only Convex queries for assigned program data.
    - Loading, empty, error, unauthorized, disabled, and success-ready states.
  include_as_integration:
    - Handoff to workout logging once the training submission feature exists.
    - Progress/status indicators once training results exist.
  exclude:
    - Coach program builder.
    - Program assignment form.
    - Workout logging submission.
    - Editing submitted training results.
    - Program statistics dashboard.
    - Progress photos.
    - Program calendar view beyond the chosen MVP schedule display.
data:
  access: trainee-owned
  source_records:
    - programAssignments
    - programs
    - programRoutines
    - routines
    - routineExerciseBlocks
    - routineSetTargets
    - exercises
  related_future_records:
    - trainingResults
    - trainingResultSetResults
    - activities
  required_fields:
    - assignmentId
    - programId
    - traineeId
    - title
    - durationWeeks
    - routine placements or clear empty-program state
validation:
  assignment_access: assignment traineeId must match authenticated trainee
  program_visibility: only assigned programs are visible to trainee
  routine_visibility: only routines reachable through assigned program are visible
  media: exercise photos and video links remain optional
architecture:
  route_candidate: src/routes/my-program.tsx
  widget: src/widgets/trainee-program-view
  feature: src/features/view-assigned-program
  program_entity: src/entities/program
  routine_entity: src/entities/routine
  exercise_entity: src/entities/exercise
  assignment_backend: convex/programAssignments.ts
```

## Product Decisions

- The trainee view is read-only in MVP. It shows assigned training content and prepares the handoff to workout logging, but does not let trainees edit programs or routines.
- Trainees can only see programs assigned to their own user id. Coach-owned program library queries must not be reused directly for this screen.
- The exact assigned-program persistence model is unresolved: live reference versus trainee-specific snapshot. This view must work with the final chosen model and should not assume one silently.
- Program routines use a flexible ordered list for MVP. The trainee view should render that sequence clearly and avoid calendar behavior unless week/day scheduling is explicitly promoted later.
- Exercise media is supportive, not required. Missing photos or video links must not block viewing or starting a routine.
- Workout logging is a separate feature. This page should expose a clear start/continue affordance once logging exists, but this document does not define submission payloads.

## UX Shape

This surface is mobile-first. A trainee may open it near a training session, so the first screen should answer: what program am I on, what should I do next, and what will this workout contain?

Primary layout:

- Header: current program title, coach/program context if available, duration in weeks.
- Current training block: the next/current routine with a clear `Rozpocznij trening` or disabled future handoff.
- Program structure: ordered routine sequence.
- Routine preview: exercise list with target sets, units, rest duration, target RPE, instructions, and optional media.
- Secondary area: assigned date and lightweight progress context once training results exist.

Program structure display:

| Schedule model | Trainee display | Notes |
| --- | --- | --- |
| Flexible order | Ordered routine sequence with completion state | Chosen for MVP because it matches current program data and supports simple self-paced plans |
| Week-based | Weeks as sections with ordered routines | Later scope if weekly planning becomes required |
| Week and day | Week tabs/sections with day rows | Later scope if exact training days matter |

Current/next routine behavior:

- Before workout logging exists, show a routine preview and a disabled or placeholder start action with no fake submission.
- After workout logging exists, the primary action should open the current routine logging flow.
- If no routine can be determined because the ordered list is empty, show a calm empty state and explain that the coach has not added workouts yet.

Routine preview content:

- Exercise name.
- Exercise type label.
- Target sets with units: kg, reps, seconds, meters, RPE, rest.
- Instructions as a numbered list when available.
- Optional photo or video link when available.
- Superset grouping when present, with non-color-only labeling.

States:

- Loading: skeleton with stable program header and routine rows.
- Empty: no assigned program, explain that no program has been assigned yet.
- Empty assigned program: program exists but has no routines, explain that the coach has not filled it yet.
- Error: show retry and avoid exposing internal ownership details.
- Unauthorized: signed-in user is not allowed to view this assignment.
- Disabled: start logging disabled until workout logging feature exists or routine data is valid.

## Data Model Plan

Current schema already has the source tables needed for a read-only trainee view:

```ts
programAssignments: defineTable({
  assignedAt: v.number(),
  coachId: v.id('users'),
  programId: v.id('programs'),
  traineeId: v.id('users'),
})
  .index('by_coach', ['coachId'])
  .index('by_trainee', ['traineeId'])

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

Recommended data/query shape:

- Add `programAssignments.by_trainee_and_program` if the UI needs direct assignment lookup by program.
- Add `programAssignments.by_program` if program detail needs assignment counts or delete guards elsewhere.
- Keep trainee reads through assignment records, not direct program ownership queries.
- Return a denormalized view model from Convex for this page: assignment summary, program summary, ordered placements, routine summaries, exercise summaries, and set targets.
- Keep the view model bounded. A single assigned program is okay; lists of assignments should be paginated or limited.

Snapshot/live impact:

- Live reference: query resolves `programAssignments.programId` into current program/routine records.
- Snapshot: query resolves assignment snapshot records instead of current templates.
- The frontend should depend on a stable assigned-program view model so the backend can switch implementation after the product decision.

## Backend API Plan

Convex module: `convex/programAssignments.ts`

Functions:

- `listForTrainee`: authenticated trainee query, returns assigned program summaries for the signed-in trainee.
- `getAssignedProgram`: authenticated trainee query, takes assignment id or program id, validates ownership, returns full program view model.
- `getCurrentRoutineCandidate`: optional query after scheduling rules are chosen, returns the routine that should be primary in the UI.

Supporting reads:

- Program placement resolution from `programRoutines.by_program`.
- Routine blocks from `routineExerciseBlocks.by_routine`.
- Set targets from `routineSetTargets.by_routine_exercise_block`.
- Exercise details from `exercises`, including optional media and instructions.

Authorization:

- Derive authenticated user server-side using Convex Auth.
- Load the signed-in `users` row by token identifier.
- Require role `trainee` for trainee-specific queries unless a future shared preview path is explicitly designed.
- Verify every assignment returned has `traineeId` equal to the authenticated trainee user id.
- Do not return coach-only program management data, other trainees, or unassigned programs.

Performance notes:

- Avoid unbounded `.collect()` for trainee assignment lists.
- For one program detail, bounded child reads are acceptable for MVP if program size is reasonable.
- If programs become large, add paginated routine sections or precomputed assignment view records.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/program`: assigned program labels, duration helpers, schedule display helpers, and view-model types.
- `entities/routine`: routine preview helpers, set target display labels, and grouping utilities.
- `entities/exercise`: exercise type labels, media presence helpers, and instruction display helpers.
- `features/view-assigned-program`: data binding, selected assignment state, current routine selection, and start-training handoff.
- `widgets/trainee-program-view`: page composition, assigned program header, routine schedule list, routine preview, empty/error states.
- `src/routes/my-program.tsx`: route-level binding only, subject to final route naming.

Candidate feature-local components:

- `AssignedProgramHeader`
- `CurrentRoutinePanel`
- `ProgramScheduleList`
- `RoutinePreview`
- `ExerciseTargetSummary`
- `ExerciseInstructionPreview`
- `StartTrainingAction`

Do not move these into `shared/ui` in the first pass. They are domain-specific until multiple trainee surfaces need the same shapes.

## Implementation Plan

1. Confirm assigned program persistence: live template reference or trainee-specific snapshot.
2. Decide final trainee route naming and navigation placement.
3. Add assigned program view-model types and helpers in `src/entities/program`.
4. Add routine target display helpers in `src/entities/routine`.
5. Add `listForTrainee` and `getAssignedProgram` in `convex/programAssignments.ts`.
6. Add required indexes to `convex/schema.ts` if current indexes are not enough for safe lookups.
7. Add focused Convex tests for trainee isolation and assigned program resolution.
8. Add `features/view-assigned-program` for query binding and selected assignment state.
9. Add `widgets/trainee-program-view` with loading, empty, error, unauthorized, and populated states.
10. Add route candidate `src/routes/my-program.tsx` or the chosen trainee route.
11. Add mobile-first browser checks and ensure routine targets, units, and media states are legible.
12. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, and `npm run build`.

## Acceptance Criteria

- Trainee can open the assigned program route.
- Trainee with no assigned programs sees a clear empty state.
- Trainee with one assigned program sees title, description, duration, assigned date, and routine structure.
- Trainee with multiple assigned programs can choose between them or sees a clear current/default program rule.
- Program routines render as a flexible ordered sequence.
- Routine preview shows exercises, set targets, target RPE, rest duration, instructions, and optional media.
- Numeric targets always include units and context.
- Missing exercise photo or video does not create an error state.
- Start-training action is available only when workout logging exists and routine data is valid.
- Trainee cannot view another trainee's assigned program by changing route/search params.
- Coach program library data is not exposed through trainee queries.
- Loading, empty, error, unauthorized, and disabled states are implemented.
- Mobile layout remains readable with touch-friendly routine rows and actions.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: trainee sees own assigned program list.
- Convex query: trainee cannot fetch another trainee's assignment.
- Convex query: unauthenticated user cannot read assigned programs.
- Convex query: coach cannot use trainee-specific query unless a separate preview flow is designed.
- Data state: assigned program with no routines renders empty-program state.
- Data state: routine with missing optional media still renders.
- Browser mobile: assigned program header, current routine, and exercise targets are readable.
- Browser desktop: page does not become a coach-style dense dashboard.

## Open Follow-Ups

- Decide whether assigned programs are snapshots or live references to program templates.
- Decide how to choose the current routine when multiple routines are available.
- Define the workout logging handoff once the training submission feature is documented.
- Define trainee navigation shell and final route naming.
