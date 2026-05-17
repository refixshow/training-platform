# Trainee Dashboard Feature

## Feature DSL

```yaml
feature: trainee-dashboard
status: planned
surface: trainee-app
route_candidate: /dashboard
primary_actor: trainee
supporting_actor: coach
business_goal:
  - Give trainees a clear overview of training progress, consistency, and body changes.
  - Reuse submitted training data so coaches and trainees interpret progress from the same source of truth.
scope:
  include:
    - Trainee dashboard shell.
    - Current assigned program summary.
    - Recent training summary.
    - Weekly duration.
    - Weekly volume where reliable.
    - Weekly completed sets.
    - Bodyweight trend.
    - Progress photo preview or slider entry point.
    - Activity map or activity consistency section.
    - Recent training results list.
    - Loading, empty, error, unauthorized, and partial-data states.
  include_as_integration:
    - Link to assigned program view.
    - Link to workout logging.
    - Link to progress photo upload/view.
    - Link to training result detail.
  exclude:
    - Coach dashboard.
    - Coach comments.
    - Advanced analytics.
    - Personal records.
    - Estimated one-rep max trends.
    - Muscle group volume distribution.
    - Client adherence score.
    - Data export.
data:
  access: trainee-owned-read
  source_records:
    - programAssignments
    - programs
    - trainingResults
    - trainingResultSetResults
    - activities
    - bodyweightEntries
    - progressPhotos
  related_records:
    - routines
    - exercises
  required_metrics:
    - weeklyDurationMinutes
    - weeklyCompletedSets
    - weeklyVolumeKg where reliable
    - recentTrainingResults
    - activityEntries
  optional_metrics:
    - bodyweightTrend
    - progressPhotoTimeline
    - currentProgramProgress
validation:
  trainee_access: all data must belong to authenticated trainee
  units: every metric must include unit and timeframe
  partial_data: missing photos, bodyweight, or results must produce empty states
architecture:
  route_candidate: src/routes/dashboard.tsx
  widget: src/widgets/trainee-dashboard
  feature: src/features/view-trainee-progress
  statistics_entity: src/entities/statistics
  training_result_entity: src/entities/training-result
  progress_photo_entity: src/entities/progress-photo
  bodyweight_entity: src/entities/bodyweight
  backend: convex/traineeDashboard.ts
```

## Product Decisions

- This dashboard is trainee-owned. It must read only the authenticated trainee's data.
- The dashboard should summarize progress without becoming a motivational landing page or overloaded analytics grid.
- Training submissions are the source of weekly duration, completed sets, volume where reliable, and activity entries.
- Bodyweight storage is an open product decision. The dashboard can display a bodyweight trend only after the bodyweight source is confirmed.
- Progress photo coach visibility is an open product decision. This trainee dashboard can show the trainee's own photos; coach visibility belongs to progress-photo permissions.
- Activity map style is an open product decision: calendar intensity, completion dots, or both. Do not hard-code the final visualization until that decision is made.
- Charts must be functional and contextual. No decorative charts without labels, units, timeframe, and useful empty states.

## UX Shape

The dashboard should be a quick progress overview for a trainee, not a coach-style reporting suite. It should answer: what am I doing now, what did I recently complete, and how is my consistency/progress moving?

Primary layout:

- Top section: current assigned program and next useful action.
- Progress snapshot: weekly duration, completed sets, volume where reliable.
- Consistency section: activity map or weekly activity strip.
- Body progress section: bodyweight trend and progress photo preview when data exists.
- Recent trainings: compact list of submitted results with routine name, date, duration, sets, and volume.

Mobile-first order:

1. Current program / next training.
2. This week summary.
3. Recent activity.
4. Bodyweight and progress photos.
5. Recent training results.

Desktop layout:

- Keep the same hierarchy.
- Use two-column grouping only when it improves scanning.
- Avoid a wide grid where every metric competes for attention.

Primary actions:

- `Kontynuuj program` or `Rozpocznij trening` when assigned program and logging are available.
- `Dodaj zdjecie progresu` when progress photos are enabled.
- `Zobacz wyniki` for recent training history.

Metric rules:

- Weekly duration: minutes or hours, with week range.
- Weekly sets: completed sets, with week range.
- Weekly volume: kg, only when calculation is reliable.
- Bodyweight: kg, with date range and latest value.
- Activity: completion count or intensity with date labels.
- Progress photos: date and optional bodyweight/note, never unlabeled thumbnails only.

States:

- Loading: stable skeleton for summary cards and recent list.
- No assigned program: show clear empty state and avoid fake stats.
- No training results: show current program action and explain stats appear after submitted trainings.
- No bodyweight data: show bodyweight empty state if the feature is enabled.
- No progress photos: show upload prompt if progress photos are enabled.
- Error: show retry and avoid exposing internal data details.
- Unauthorized: block access and route toward sign-in or correct role handling.

## Data Model Plan

Current schema includes the core source tables:

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

bodyweightEntries: defineTable({
  createdAt: v.number(),
  traineeId: v.id('users'),
  valueKg: v.number(),
}).index('by_trainee', ['traineeId'])

progressPhotos: defineTable({
  bodyweightKg: v.optional(v.number()),
  capturedAt: v.number(),
  note: v.optional(v.string()),
  storageId: v.id('_storage'),
  traineeId: v.id('users'),
}).index('by_trainee', ['traineeId'])
```

Recommended schema/index tightening:

- Add `trainingResults.by_trainee_and_completed_at` for recent history and weekly statistics.
- Add `activities.by_trainee_and_created_at` for activity map ranges.
- Add `bodyweightEntries.by_trainee_and_created_at` for trend ranges.
- Add `progressPhotos.by_trainee_and_captured_at` for timeline and slider ordering.
- Consider denormalized fields on `trainingResults`: `completedSets` and `volumeKg` when submission rules are finalized.
- Avoid maintaining broad counters until the MVP query patterns prove they need denormalization.

Metric derivation:

- Weekly duration: sum `trainingResults.durationMinutes` for the selected week.
- Weekly sets: count submitted set result rows or use `trainingResults.completedSets` if denormalized.
- Weekly volume: sum reliable per-set volume, primarily `weightKg * reps` for weight-and-reps submissions.
- Activity map: derive from `activities` linked to training completion.
- Bodyweight trend: ordered `bodyweightEntries`, with possible progress photo bodyweight integration after bodyweight decision.
- Progress photos: signed URLs from Convex storage plus captured date, note, and optional bodyweight.

## Backend API Plan

Convex module: `convex/traineeDashboard.ts`

Functions:

- `getOverview`: public query, authenticated trainee only, returns current dashboard view model.
- `getTrainingSummaryRange`: public query, authenticated trainee only, returns weekly/monthly duration, sets, and reliable volume.
- `getActivityRange`: public query, authenticated trainee only, returns activity entries for the dashboard range.
- `getBodyweightTrend`: public query, authenticated trainee only, returns bounded bodyweight entries.
- `getProgressPhotoPreview`: public query, authenticated trainee only, returns recent photos with signed URLs.
- `getRecentTrainingResults`: public query, authenticated trainee only, returns bounded recent result summaries.

Authorization:

- Derive authenticated user server-side with Convex Auth.
- Require role `trainee` for trainee dashboard queries unless a separate coach preview flow is explicitly designed.
- Never accept a trusted `traineeId` from the client for this dashboard.
- Every returned record must be owned by the authenticated trainee.
- Coach access to the same data belongs to coach review/statistics queries, not this trainee dashboard API.

Performance:

- All dashboard sections must be bounded by date range or result limit.
- Avoid unbounded `.collect()`.
- Prefer indexed range queries after adding date indexes.
- If dashboard aggregation becomes expensive, introduce precomputed summary docs in a later performance pass.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/statistics`: metric view models, date range labels, chart data mapping, empty-state helpers.
- `entities/training-result`: result summary types, volume/set/duration helpers.
- `entities/progress-photo`: photo preview types and display helpers.
- `entities/bodyweight`: bodyweight trend types and unit labels.
- `features/view-trainee-progress`: query binding, timeframe state, and section-level state handling.
- `widgets/trainee-dashboard`: page composition, overview sections, cards, charts, activity map, recent list.
- `src/routes/dashboard.tsx`: route candidate, subject to final trainee route shell.

Candidate feature-local components:

- `TraineeProgressSummary`
- `CurrentProgramPanel`
- `WeeklyTrainingMetrics`
- `ActivityMapPreview`
- `BodyweightTrend`
- `ProgressPhotoPreview`
- `RecentTrainingResults`
- `DashboardEmptyState`

Use Recharts for trend/chart sections once real data exists. Keep chart components domain-specific at first; do not move to `shared/ui` until multiple dashboards reuse the same component contract.

## Implementation Plan

1. Confirm trainee route shell and dashboard route naming.
2. Confirm bodyweight source: independent entries, progress photos, training summaries, or all three.
3. Confirm progress photo coach visibility separately from trainee dashboard visibility.
4. Confirm activity map style: calendar intensity, completion dots, or both.
5. Add metric view-model helpers in `src/entities/statistics`.
6. Add bodyweight and progress photo display helpers in their entity slices.
7. Add required Convex indexes for date-ordered dashboard queries.
8. Add `convex/traineeDashboard.ts` with bounded trainee-owned overview queries.
9. Add focused tests for authorization, empty states, date ranges, and metric derivation.
10. Add `features/view-trainee-progress` for data binding and timeframe state.
11. Add `widgets/trainee-dashboard` with mobile-first layout and all section states.
12. Add route candidate `src/routes/dashboard.tsx` or the chosen trainee dashboard route.
13. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser checks on mobile and desktop.

## Acceptance Criteria

- Trainee can open their dashboard route.
- Dashboard shows current assigned program or a clear no-program empty state.
- Dashboard shows weekly duration with unit and date range.
- Dashboard shows weekly completed sets with unit and date range.
- Dashboard shows weekly volume only where reliable and labeled in kg.
- Dashboard shows recent training results after submissions exist.
- Dashboard shows activity consistency based on activity records.
- Dashboard shows bodyweight trend only when bodyweight data exists.
- Dashboard shows progress photo preview only when photos exist.
- Empty states explain what action creates each data type.
- Trainee cannot view another trainee's dashboard by changing route or query params.
- Coach-only review data is not exposed through trainee dashboard queries.
- Charts include labels, units, timeframe, and accessible fallback text.
- Mobile layout is readable and does not create an overloaded dashboard.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: trainee sees only own dashboard data.
- Convex query: unauthenticated user cannot read dashboard.
- Convex query: coach cannot use trainee dashboard query unless a separate preview flow exists.
- Metric derivation: weekly duration, completed sets, and reliable volume match seeded result data.
- Empty states: no program, no training results, no bodyweight, no photos.
- Browser mobile: sections stack in priority order and remain readable.
- Browser desktop: dashboard stays calm and avoids decorative metric overload.
- Accessibility: charts and activity map do not rely on color alone.

## Open Follow-Ups

- Decide where bodyweight is stored and which source the dashboard uses first.
- Decide whether progress photos are visible to coaches by default.
- Decide activity map style: calendar intensity, completion dots, or both.
- Decide current program/current routine selection rules for flexible ordered programs.
- Coach dashboard/statistics should be documented separately because density, filters, and permissions differ.
