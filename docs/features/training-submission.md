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
    - Server-backed in-progress training draft saved in Convex.
    - Resume in-progress draft after refresh, route leave, browser close, or switching device/browser.
    - Autosave set values, completion state, duration, and notes while the trainee logs the workout.
    - Draft status feedback for saved, saving, failed, stale, and restored states.
    - Warning before leaving/reloading when local changes have not reached Convex yet.
    - Partial training completion where only completed/filled set rows are submitted into the final result.
    - Submit training summary.
    - Create training result on submission.
    - Create training result set rows on submission.
    - Create activity record on submission.
    - Derived summary values for duration, sets, and volume where reliable.
    - Trainee result history read contract.
    - Coach review read contract.
    - Loading, server draft restore, validation, submit, success, empty, error, and unauthorized states.
  include_as_integration:
    - Assigned program view start action.
    - Future trainee dashboard statistics.
    - Future coach review/statistics surfaces.
  exclude:
    - Editing submitted training results until product decision is made.
    - Coach approval workflow until product decision is made.
    - Local-only draft persistence as the primary resilience strategy.
    - Full offline-first mode where the trainee can reliably start and finish a workout without any network connection.
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
    - trainingDrafts
    - trainingDraftSetResults
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
- Active workout progress is saved as a Convex-backed training draft in MVP. Do not rely on local React state or localStorage as the authoritative persistence layer.
- Partial training submission is allowed. A trainee may submit a workout with only some sets completed when the real session was incomplete.
- Final submitted results stay final in MVP unless the separate edit-submitted-result decision is made later.
- Skipped-set semantics are still unresolved. Until decided, completed/filled sets should become result rows; untouched sets should remain absent from the submitted result rather than being treated as completed failures.

## UX Shape

This is the highest-friction trainee workflow in the product, so the screen must be mobile-first, forgiving, and fast under real training conditions.

Primary flow:

1. Trainee opens assigned program.
2. Trainee starts the current routine or selected routine.
3. App shows exercises in routine order.
4. App creates or restores the active Convex draft for this assignment and routine.
5. Trainee fills per-set values with fields matched to each exercise type.
6. App autosaves changes to the Convex draft and shows the draft status.
7. Trainee can leave, refresh, or return later and continue from the restored draft.
8. Trainee reviews a short training summary.
9. Trainee submits completed/filled rows as the final result.
10. App clears or closes the draft, confirms completion, and makes the result available for trainee progress and coach review.

Workout logging layout:

- Sticky routine header: routine name, program context, progress through exercises.
- Exercise block: exercise name, type, optional photo/video/instructions, target summary.
- Set rows: compact numeric inputs with units and target context.
- Completion controls: set done/skip state if included, without relying on color alone.
- Summary footer: completed sets, estimated duration, visible submit action.
- Final review: duration, completed sets, optional notes, warning for incomplete required fields.
- Draft status strip: saved/saving/error/restored state, last saved timestamp, and retry affordance when autosave fails.
- Leave protection: browser reload/route leave warning only when the latest local edits have not been persisted to Convex.

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
- Clear warning when not all planned sets are completed, without blocking intentional partial submission.

States:

- Loading: routine shell and set-row skeletons.
- Restoring draft: routine is visible only after the active draft has been resolved or created.
- Empty: routine has no exercises or targets.
- Error: retry without losing local unsaved values when possible.
- Unauthorized: trainee cannot access this routine/program.
- Disabled: submit blocked until minimum required fields are valid.
- Autosaving: local edits are being persisted to Convex.
- Draft saved: latest local edits are stored in Convex and can be restored later.
- Draft save failed: trainee can keep editing locally in the current page, retry save, or attempt final submit; UI must clearly say the latest draft may not survive a page close.
- Restored: the screen should clearly indicate when values were restored from an existing draft.
- Partial: incomplete sets can remain visible and unsubmitted; completed rows with missing required fields explain what is missing.
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

Add server-backed draft tables for resilient in-progress workouts:

```ts
trainingDrafts: defineTable({
  assignmentId: v.id('programAssignments'),
  createdAt: v.number(),
  durationMinutes: v.optional(v.number()),
  lastSavedAt: v.number(),
  notes: v.optional(v.string()),
  programId: v.id('programs'),
  routineId: v.id('routines'),
  status: v.union(v.literal('active'), v.literal('submitted'), v.literal('discarded')),
  traineeId: v.id('users'),
})
  .index('by_trainee_and_status', ['traineeId', 'status'])
  .index('by_assignment_routine_status', ['assignmentId', 'routineId', 'status'])

trainingDraftSetResults: defineTable({
  completed: v.boolean(),
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  draftId: v.id('trainingDrafts'),
  exerciseId: v.id('exercises'),
  reps: v.optional(v.number()),
  routineExerciseBlockId: v.id('routineExerciseBlocks'),
  rpe: v.optional(v.number()),
  setIndex: v.number(),
  updatedAt: v.number(),
  weightKg: v.optional(v.number()),
})
  .index('by_draft', ['draftId'])
  .index('by_draft_block_set', ['draftId', 'routineExerciseBlockId', 'setIndex'])
```

Recommended schema tightening:

- Add `trainingResults.by_trainee_and_completed_at` for history and statistics.
- Add `trainingResults.by_program` if coach review needs program-level filtering.
- Add `trainingResults.by_trainee_and_program` if trainee program progress needs efficient filtering.
- Store derived fields on `trainingResults`: `completedSets` and `volumeKg` where reliable.
- Consider storing `sourceAssignmentId` on `trainingResults` after the assignment model is settled.
- Do not add draft/edit status to final `trainingResults` for MVP. Draft lifecycle belongs to `trainingDrafts`; submitted results remain final.
- Keep set results as child rows. Do not store unbounded set arrays in `trainingResults`.
- Enforce at most one active draft per trainee, assignment, and routine unless a future product decision allows multiple concurrent attempts.
- When a draft is submitted, create final result rows atomically and mark the draft `submitted` in the same mutation.

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
- `getOrCreateDraft`: public mutation, authenticated trainee only, validates assigned access and returns the active draft with draft set rows.
- `updateDraft`: public mutation, authenticated trainee only, validates assigned access and upserts draft values and draft set rows.
- `discardDraft`: public mutation, authenticated trainee only, marks an active draft as discarded when the trainee intentionally abandons it.
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
- Validate draft set values against the exercise type on every draft update. Drafts may contain incomplete rows, but completed rows must not contain impossible values.
- Reject negative numbers and impossible values.
- Validate `rpe` from 1 to 10 when provided.
- Validate `setIndex` and exercise ids against the source routine, unless product explicitly allows extra ad hoc sets.
- Treat missing optional notes as absent or `null`, not `undefined` in returned payloads.

Mutation behavior:

- Submit should run as one Convex mutation so result rows and activity are created atomically.
- Submit from a draft should re-read the server draft, validate the latest persisted rows, create final result rows from completed/filled rows, create the activity, and mark the draft submitted atomically.
- Autosave should be debounced on the client and idempotent on the server. Repeated updates for the same draft/block/set should patch the same draft set row rather than inserting duplicates.
- Keep mutation size bounded by reasonable routine size.
- If very large routines become possible, add chunked draft updates or per-row mutations before supporting huge submissions.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/training-result`: result types, Zod schemas, derived summary helpers, unit labels, and result display helpers.
- `entities/routine`: routine logging view-model helpers and set target display utilities.
- `entities/exercise`: exercise type field mapping and labels.
- `features/submit-training-result`: form state, submit mapping, validation, optimistic disabled states, success handling.
- `features/manage-training-draft`: draft restore, autosave, retry, dirty-state tracking, discard behavior, and submit-from-draft coordination.
- `widgets/workout-logging`: page composition, routine header, exercise blocks, set rows, summary footer, review state.
- `widgets/training-result-summary`: reusable result summary for trainee history and coach review if needed.
- `src/routes/my-program/training.tsx`: route candidate for logging from assigned program view.

Formik guidance:

- Formik may be used if the whole routine is one structured form.
- Local state may be better for per-set touch interactions if Formik becomes too heavy on mobile.
- If local state is used, still keep Zod schemas for payload validation and tests.
- Local React state may hold the currently edited values, but it must be synchronized to Convex drafts and must not be the only place a trainee's progress exists.
- A small local fallback cache may be used only for unsent changes while Convex autosave is retrying; Convex remains the source of truth once the network is available.

Candidate feature-local components:

- `WorkoutLoggingPanel`
- `ExerciseLoggingBlock`
- `SetResultRow`
- `ExerciseMediaHint`
- `TrainingSummaryReview`
- `DraftSaveStatus`
- `ResumeDraftNotice`
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

1. Confirm assigned program persistence: live template reference or trainee-specific snapshot.
2. Confirm whether bodyweight is part of training submission, independent tracking, progress photos, or all three.
3. Decide skipped-set semantics: absent rows only, explicit skipped rows, or coach-visible skip reasons.
4. Add training result and training draft schemas, unit labels, draft status labels, and derived summary helpers in `src/entities/training-result`.
5. Add exercise-type field mapping helpers if not already centralized in `src/entities/exercise`.
6. Add `trainingDrafts` and `trainingDraftSetResults` to `convex/schema.ts` with indexes for active draft restore.
7. Add `convex/trainingResults.ts` functions for `getLoggingRoutine`, `getOrCreateDraft`, `updateDraft`, `discardDraft`, `submit`, `listForTrainee`, and coach review queries.
8. Add required indexes to `convex/schema.ts` for trainee history, program filtering, coach review, and active draft lookup.
9. Add Convex tests for authorization, draft restore, idempotent autosave, field validation, atomic submit-from-draft, draft close, and activity creation.
10. Add `features/manage-training-draft` for restore, autosave, retry, dirty-state tracking, and leave protection.
11. Add `features/submit-training-result` for final submit mapping and validation from the persisted draft.
12. Add `widgets/workout-logging` with mobile-first logging UI, draft status UI, partial completion warnings, and all core states.
13. Add route candidate `src/routes/my-program/training.tsx` or the final trainee route.
14. Wire start/continue action from `trainee-program-view` to the logging route and show active draft state when available.
15. Add basic result summary view or success state after submission.
16. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and mobile browser checks.

## Acceptance Criteria

- Trainee can open a logging screen only for a routine from their assigned program.
- Logging screen renders exercises in routine order.
- Each exercise shows only result fields relevant to its exercise type.
- Target values remain visible while entering actual values.
- Numeric fields include units and mobile-friendly input modes.
- Trainee changes are autosaved to a Convex draft while logging.
- Trainee can refresh, leave, close the tab, or open another browser/device and restore the active draft.
- UI clearly shows when the draft is saving, saved, restored, or failed to save.
- UI warns before route leave/reload only when there are unsaved local edits not yet persisted to Convex.
- Trainee can intentionally submit a partial workout with only completed/filled sets.
- Trainee can submit a valid routine result from the persisted draft.
- Submission creates one `trainingResults` row.
- Submission creates set result rows for submitted sets.
- Submission creates one linked training activity.
- Submission marks the active draft as submitted or otherwise prevents it from reappearing as active.
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
- Convex mutation: `getOrCreateDraft` returns the existing active draft instead of creating duplicates.
- Convex mutation: `updateDraft` is idempotent for the same draft/block/set row.
- Convex mutation: submit-from-draft marks the draft submitted and does not leave an active duplicate.
- Convex query/mutation: trainee cannot read, update, discard, or submit another trainee's draft.
- Convex validation: reject invalid RPE, negative numbers, wrong fields for exercise type, wrong set index, and exercise not in routine.
- Authorization: unauthenticated user cannot submit; coach cannot submit as trainee; trainee cannot submit another trainee's routine.
- Coach review: coach can read managed trainee result and cannot read unmanaged trainee result.
- Browser mobile: exercise blocks, set rows, units, and submit footer are readable and touch-friendly.
- Browser resilience: refresh after entering values restores the Convex draft.
- Browser resilience: route leave and return restores the Convex draft.
- Browser resilience: autosave failure state is visible and does not silently pretend the draft was saved.
- Browser desktop: workflow remains clear without becoming coach-dashboard dense.
- Data contract: submitted result appears in trainee history and is available for coach review/statistics queries.

## Open Follow-Ups

- Decide whether trainees can edit submitted training results.
- Decide whether coaches approve edited or submitted results.
- Decide where bodyweight is stored.
- Decide whether extra sets beyond prescribed targets are allowed.
- Decide whether skipped sets are explicit records or simply absent set results.
- Decide how current routine selection works when multiple assigned routines are available.
- Decide whether full offline-first workout logging is needed beyond Convex-backed drafts and transient local retry state.
