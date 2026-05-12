# Training Submission Feature

## Feature DSL

```yaml
feature: training-submission
status: planned
surface: trainee-app
route_candidate: /my-program/training
primary_actor: trainee
supporting_actor: coach
business_goal:
  - Let trainees fill in assigned program routines after training.
  - Store submitted training data so trainees and coaches can review progress and statistics.
scope:
  include:
    - Start or continue workout logging from assigned program view.
    - Routine logging screen generated from assigned routine targets.
    - Per-set result fields based on exercise type.
    - RPE, weight, reps, duration, distance, and completion values where applicable.
    - Training duration and optional trainee notes.
    - Submit training summary.
    - Create training result on submission.
    - Create training result set rows on submission.
    - Create activity record on submission.
    - Derived summary values for duration, sets, and volume where reliable.
    - Trainee result history read contract.
    - Coach review read contract.
    - Loading, draft-like local state, validation, submit, success, empty, error, and unauthorized states.
  include_as_integration:
    - Assigned program view start action.
    - Future trainee dashboard statistics.
    - Future coach review/statistics surfaces.
  exclude:
    - Editing submitted training results until product decision is made.
    - Coach approval workflow until product decision is made.
    - Offline draft persistence.
    - Rest timer.
    - Previous result comparison.
    - Inline exercise substitution.
    - Coach comments.
    - Advanced analytics and personal records.
data:
  access: trainee-owned-write-coach-readable
  source_records:
    - programAssignments
    - programs
    - programRoutines
    - routines
    - routineExerciseBlocks
    - routineSetTargets
    - exercises
  created_records:
    - trainingResults
    - trainingResultSetResults
    - activities
  related_future_records:
    - bodyweightEntries
    - progressPhotos
  required_fields:
    - routineId
    - traineeId
    - completedAt
    - per-set submitted values matching exercise type
  optional_fields:
    - programId
    - durationMinutes
    - notes
    - rpe
    - weightKg
    - reps
    - durationSeconds
    - distanceMeters
validation:
  assignment_access: routine must be reachable through the trainee assigned program
  exercise_type_fields: submitted fields must match exercise type
  numeric_values: non-negative and unit-specific
  submitted_sets: setIndex must map to routine targets or be explicitly allowed as extra
architecture:
  route_candidate: src/routes/my-program/training.tsx
  widget: src/widgets/workout-logging
  submit_feature: src/features/submit-training-result
  program_entity: src/entities/program
  routine_entity: src/entities/routine
  exercise_entity: src/entities/exercise
  training_result_entity: src/entities/training-result
  backend: convex/trainingResults.ts
```

## Product Decisions

- Trainees submit results only for routines reachable through their own assigned programs.
- Coach visibility is read-only for submitted training results in MVP. Coaches can review, compare, and use the data for progress/statistics, but comments and approvals are later scope unless explicitly promoted.
- Editing submitted training results is an open product decision. Do not implement edit, correction, or approval behavior until the decision is made.
- Bodyweight storage is an open product decision. This feature may display a future bodyweight prompt, but should not decide whether bodyweight belongs to training summaries, progress photos, independent entries, or all three.
- Assigned program persistence is still unresolved. Submission must work with the final snapshot/live assignment model and should store enough historical context to preserve what the trainee actually completed.
- Activity records are created from submitted training results and power activity maps, weekly duration, weekly sets, and weekly volume.

## UX Shape

This is the highest-friction trainee workflow in the product, so the screen must be mobile-first, forgiving, and fast under real training conditions.

Primary flow:

1. Trainee opens assigned program.
2. Trainee starts the current routine or selected routine.
3. App shows exercises in routine order.
4. Trainee fills per-set values with fields matched to each exercise type.
5. Trainee reviews a short training summary.
6. Trainee submits.
7. App confirms completion and makes the result available for trainee progress and coach review.

Workout logging layout:

- Sticky routine header: routine name, program context, progress through exercises.
- Exercise block: exercise name, type, optional photo/video/instructions, target summary.
- Set rows: compact numeric inputs with units and target context.
- Completion controls: set done/skip state if included, without relying on color alone.
- Summary footer: completed sets, estimated duration, visible submit action.
- Final review: duration, completed sets, optional notes, warning for incomplete required fields.

Set input UI by exercise type:

| Exercise type | Submitted fields | Notes |
| --- | --- | --- |
| Weight and reps | weightKg, reps, optional rpe | Used for volume calculation |
| Reps only | reps, optional rpe | Bodyweight may affect future volume, but not required |
| Bodyweight | reps, optional rpe | Do not require bodyweight until bodyweight decision is made |
| Assisted bodyweight | weightKg as assistance, reps, optional rpe | Label assistance clearly |
| Duration | durationSeconds, optional rpe | Use seconds internally, readable minutes/seconds in UI |
| Weight and duration | weightKg, durationSeconds, optional rpe | Volume rules may be limited |
| Distance and duration | distanceMeters, durationSeconds, optional rpe | Useful for pace later |
| Weight and distance | weightKg, distanceMeters, optional rpe | Use meters internally |

Review summary:

- Program and routine context.
- Completion date/time.
- Duration in minutes.
- Completed sets count.
- Submitted volume when calculation is reliable.
- Optional trainee notes.
- Clear confirmation that the result will be visible to coach.

States:

- Loading: routine shell and set-row skeletons.
- Empty: routine has no exercises or targets.
- Error: retry without losing local unsaved values when possible.
- Unauthorized: trainee cannot access this routine/program.
- Disabled: submit blocked until minimum required fields are valid.
- Partial: incomplete optional sets can remain visible, but required fields explain what is missing.
- Success: confirmation and next useful action, such as back to program or view summary.

## Data Model Plan

Current schema already contains the submission tables:

```ts
trainingResults: defineTable({
  completedAt: v.number(),
  durationMinutes: v.optional(v.number()),
  notes: v.optional(v.string()),
  programId: v.optional(v.id('programs')),
  routineId: v.id('routines'),
  traineeId: v.id('users'),
})
  .index('by_routine', ['routineId'])
  .index('by_trainee', ['traineeId'])

trainingResultSetResults: defineTable({
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  exerciseId: v.id('exercises'),
  reps: v.optional(v.number()),
  rpe: v.optional(v.number()),
  setIndex: v.number(),
  trainingResultId: v.id('trainingResults'),
  weightKg: v.optional(v.number()),
})
  .index('by_exercise', ['exerciseId'])
  .index('by_training_result', ['trainingResultId'])

activities: defineTable({
  createdAt: v.number(),
  durationMinutes: v.optional(v.number()),
  traineeId: v.id('users'),
  trainingResultId: v.optional(v.id('trainingResults')),
  type: v.string(),
}).index('by_trainee', ['traineeId'])
```

Recommended schema tightening:

- Add `trainingResults.by_trainee_and_completed_at` for history and statistics.
- Add `trainingResults.by_program` if coach review needs program-level filtering.
- Add `trainingResults.by_trainee_and_program` if trainee program progress needs efficient filtering.
- Consider storing derived fields on `trainingResults`: `completedSets`, `volumeKg`, and `sourceAssignmentId` after the assignment model is settled.
- Consider `status` only if edit/approval/draft behavior is confirmed. Without that decision, submissions should be final in MVP.
- Keep set results as child rows. Do not store unbounded set arrays in `trainingResults`.

Derived values:

- Completed sets: count submitted set rows that meet minimum validity.
- Volume: reliable for `weight-and-reps` as `weightKg * reps`; other exercise types may need different metrics and should not fake volume.
- Duration: use submitted `durationMinutes` for training session duration, not the sum of all duration exercise sets unless explicitly designed.
- Activity: create a `type = training_completed` activity linked to the training result.

Historical context:

- Store `programId` when the result came from an assigned program.
- Store `routineId` always.
- If snapshot assignments are chosen, add enough assignment/snapshot identifiers to preserve the exact completed plan.
- If live references are chosen, consider storing denormalized labels or snapshot metadata to avoid old results changing meaning after coach edits.

## Backend API Plan

Convex module: `convex/trainingResults.ts`

Functions:

- `getLoggingRoutine`: public query, authenticated trainee only, validates assigned access and returns routine logging view model.
- `submit`: public mutation, authenticated trainee only, validates assigned access, validates per-set fields against exercise types, inserts `trainingResults`, `trainingResultSetResults`, and `activities`.
- `listForTrainee`: public query, authenticated trainee only, bounded/paginated result history.
- `getForTrainee`: public query, authenticated trainee only, returns one submitted result with set rows.
- `listForCoachReview`: public query, authenticated coach only, returns results for managed trainees.
- `getForCoachReview`: public query, authenticated coach only, validates coach-trainee relationship and returns one submitted result.

Authorization:

- Never accept `traineeId` as trusted for writes.
- Derive trainee identity server-side using Convex Auth token identifier.
- Verify role `trainee` for submit.
- Verify the routine is reachable through the trainee assigned program before accepting submission.
- Coach review queries must verify the coach manages the trainee before returning results.
- Unauthenticated users cannot read or mutate training results.

Validation:

- Every Convex function must have argument validators.
- Validate submitted set values against the exercise type, not only against frontend Zod.
- Reject negative numbers and impossible values.
- Validate `rpe` from 1 to 10 when provided.
- Validate `setIndex` and exercise ids against the source routine, unless product explicitly allows extra ad hoc sets.
- Treat missing optional notes as absent or `null`, not `undefined` in returned payloads.

Mutation behavior:

- Submit should run as one Convex mutation so result rows and activity are created atomically.
- Keep mutation size bounded by reasonable routine size.
- If very large routines become possible, split into a draft/session model before supporting huge submissions.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/training-result`: result types, Zod schemas, derived summary helpers, unit labels, and result display helpers.
- `entities/routine`: routine logging view-model helpers and set target display utilities.
- `entities/exercise`: exercise type field mapping and labels.
- `features/submit-training-result`: form state, submit mapping, validation, optimistic disabled states, success handling.
- `widgets/workout-logging`: page composition, routine header, exercise blocks, set rows, summary footer, review state.
- `widgets/training-result-summary`: reusable result summary for trainee history and coach review if needed.
- `src/routes/my-program/training.tsx`: route candidate for logging from assigned program view.

Formik guidance:

- Formik may be used if the whole routine is one structured form.
- Local state may be better for per-set touch interactions if Formik becomes too heavy on mobile.
- If local state is used, still keep Zod schemas for payload validation and tests.

Candidate feature-local components:

- `WorkoutLoggingPanel`
- `ExerciseLoggingBlock`
- `SetResultRow`
- `ExerciseMediaHint`
- `TrainingSummaryReview`
- `SubmitTrainingButton`
- `TrainingResultSuccess`

Do not move these into `shared/ui` in the first pass. They are product-specific and tied to training data.

## Statistics And Progress Contract

Training submissions are the source for:

- Trainee weekly duration.
- Trainee weekly sets.
- Trainee weekly volume.
- Coach view of trainee training history.
- Activity map entries.
- Later adherence and program progress.

Minimum derived data needed:

- `completedAt` for date grouping.
- `durationMinutes` for weekly duration.
- `completedSets` derived or computed for weekly set totals.
- `volumeKg` derived or computed where reliable.
- `programId` and `routineId` for filtering by assigned program and routine.
- `activity` row linked to the result for calendar/activity views.

Do not make decorative charts in this feature. The submission feature should store clean data and expose result summaries; dashboard/statistics docs can define chart presentation.

## Implementation Plan

1. Confirm whether submissions are final in MVP or editable later.
2. Confirm assigned program persistence: live template reference or trainee-specific snapshot.
3. Confirm whether bodyweight is part of training submission, independent tracking, progress photos, or all three.
4. Add training result schemas, unit labels, and derived summary helpers in `src/entities/training-result`.
5. Add exercise-type field mapping helpers if not already centralized in `src/entities/exercise`.
6. Add `convex/trainingResults.ts` with `getLoggingRoutine`, `submit`, `listForTrainee`, and coach review queries.
7. Add required indexes to `convex/schema.ts` for trainee history, program filtering, and coach review.
8. Add Convex tests for authorization, field validation, atomic submission, and activity creation.
9. Add `features/submit-training-result` for client-side validation and submit mapping.
10. Add `widgets/workout-logging` with mobile-first logging UI and all core states.
11. Add route candidate `src/routes/my-program/training.tsx` or the final trainee route.
12. Wire start action from `trainee-program-view` to the logging route.
13. Add basic result summary view or success state after submission.
14. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and mobile browser checks.

## Acceptance Criteria

- Trainee can open a logging screen only for a routine from their assigned program.
- Logging screen renders exercises in routine order.
- Each exercise shows only result fields relevant to its exercise type.
- Target values remain visible while entering actual values.
- Numeric fields include units and mobile-friendly input modes.
- Trainee can submit a valid routine result.
- Submission creates one `trainingResults` row.
- Submission creates set result rows for submitted sets.
- Submission creates one linked training activity.
- Submission stores `programId` when the result came from an assigned program.
- Invalid field combinations are rejected on frontend and in Convex.
- Trainee cannot submit for another trainee, unassigned routine, or unassigned program.
- Coach can read results only for trainees they manage.
- Trainee can see their own submitted result history.
- Result data can support weekly duration, sets, volume, and activity map calculations.
- Success state clearly confirms completion and next action.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: `getLoggingRoutine` rejects unassigned routine.
- Convex mutation: valid minimum submission creates result, set rows, and activity atomically.
- Convex validation: reject invalid RPE, negative numbers, wrong fields for exercise type, wrong set index, and exercise not in routine.
- Authorization: unauthenticated user cannot submit; coach cannot submit as trainee; trainee cannot submit another trainee's routine.
- Coach review: coach can read managed trainee result and cannot read unmanaged trainee result.
- Browser mobile: exercise blocks, set rows, units, and submit footer are readable and touch-friendly.
- Browser desktop: workflow remains clear without becoming coach-dashboard dense.
- Data contract: submitted result appears in trainee history and is available for coach review/statistics queries.

## Open Follow-Ups

- Decide whether trainees can edit submitted training results.
- Decide whether coaches approve edited or submitted results.
- Decide where bodyweight is stored.
- Decide whether extra sets beyond prescribed targets are allowed.
- Decide whether skipped sets are explicit records or simply absent set results.
- Decide how current routine selection works when multiple assigned routines are available.
- Offline draft support is later scope and should be planned separately.
