# Coach Client Dashboard Feature

Related entry route: `docs/features/coach-client-list.md` describes `/clients`
as the coach-facing list that links or redirects into this client detail surface.

## Feature DSL

```yaml
feature: coach-client-dashboard
status: planned
surface: coach-app
route_candidate: /clients/$clientId
secondary_route_candidate: /analytics/client/$clientId
primary_actor: coach
subject_actor: trainee
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Let coaches review one client's training progress, consistency, and body changes.
  - Give coaches enough context to make programming decisions without overloading the page.
scope:
  include:
    - Client dashboard shell.
    - Client profile summary.
    - Current assigned program summary.
    - Recent training results.
    - Weekly duration.
    - Weekly completed sets.
    - Weekly volume where reliable.
    - Bodyweight trend.
    - Progress photo preview or comparison entry point.
    - Activity map or consistency section.
    - Drill-down links to training result detail and assigned program.
    - Date range controls.
    - Loading, empty, partial-data, error, unauthorized, and no-client states.
  include_as_integration:
    - Link from /clients.
    - Link from /training-results.
    - Link from /analytics.
    - Future coach review comments.
  exclude:
    - Trainee dashboard.
    - Program builder.
    - Training result editing or approval until product decision is made.
    - Coach comments until explicitly scoped.
    - Alerts for missed sessions.
    - Client adherence score.
    - Data export.
    - Advanced analytics and personal records.
data:
  access: coach-managed-trainee-read
  source_records:
    - users
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
  coach_access: coach must manage the trainee
  units: every metric must include unit and timeframe
  partial_data: missing result/photo/bodyweight data must render useful empty states
architecture:
  route_candidate: src/routes/clients.$clientId.tsx
  route_alternative: src/routes/analytics.client.$clientId.tsx
  widget: src/widgets/coach-client-dashboard
  feature: src/features/view-client-progress
  statistics_entity: src/entities/statistics
  training_result_entity: src/entities/training-result
  progress_photo_entity: src/entities/progress-photo
  user_entity: src/entities/user
  backend: convex/coachClientDashboard.ts
```

## Product Decisions

- This dashboard is coach-facing and must show only trainees the authenticated coach is allowed to manage.
- Admin capabilities are part of the coach role for MVP. Do not split a separate admin dashboard yet.
- The dashboard should be denser than the trainee dashboard, but still scannable through filters, sections, and drill-down links.
- Training submissions are the source of duration, completed sets, reliable volume, recent result history, and activity consistency.
- Bodyweight storage is an open product decision. The dashboard can display bodyweight only after the source is confirmed.
- Progress photo coach visibility is an open product decision. This dashboard must respect whatever permission model is chosen.
- Activity map style is an open product decision: calendar intensity, completion dots, or both.
- Result editing and coach approval are open product decisions and should not be implied by dashboard actions.

## UX Shape

The coach dashboard should be an operational review surface. It should help the coach decide what to inspect next: missed consistency, volume changes, bodyweight movement, progress photos, or a specific training result.

Primary layout:

- Header: client identity, coach relationship context, current assigned program, quick actions.
- Range controls: last 7 days, 4 weeks, 12 weeks, custom later.
- Summary strip: duration, sets, reliable volume, latest bodyweight, completed sessions.
- Activity section: consistency map or training frequency strip.
- Training trend section: weekly duration, sets, and volume with labels and units.
- Body progress section: bodyweight trend and progress photo preview when visible.
- Recent results: dense table/list of submitted trainings with drill-down.

Coach-specific controls:

- Client selector or breadcrumb back to `/clients`.
- Date range segmented control.
- Program filter when multiple assigned programs/results exist.
- Result detail links.
- Quiet empty states that suggest setup or review next steps.

Information density:

- Use tables or compact lists for recent results.
- Use charts only when trend shape helps decision-making.
- Avoid giant stat cards that turn every number into a headline.
- Keep every metric tied to a timeframe and unit.

Key drill-downs:

- Current assigned program.
- Training result detail.
- Progress photo comparison.
- Full training history.
- Future client profile page.

States:

- Loading: stable skeleton for client header, metrics, charts, and recent results.
- No client: route param does not resolve to a managed trainee.
- No access: authenticated coach does not manage this trainee.
- No assigned program: show setup-oriented empty state.
- No training results: show empty statistics and link toward assignment/program setup.
- No bodyweight: hide chart or show bodyweight empty state.
- No progress photos: show photo empty state only if coach visibility permits it.
- Partial data: show available metrics and explicit gaps instead of hiding sections silently.

## Data Model Plan

Current schema already contains the relevant source tables:

```ts
users: defineTable({
  coachId: v.optional(v.id('users')),
  email: v.string(),
  name: v.string(),
  role: v.union(v.literal('admin'), v.literal('coach'), v.literal('trainee')),
  tokenIdentifier: v.optional(v.string()),
})
  .index('by_coach', ['coachId'])
  .index('by_role', ['role'])

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

- Add `trainingResults.by_trainee_and_completed_at` for range queries.
- Add `trainingResults.by_trainee_and_program` for program-specific review.
- Add `activities.by_trainee_and_created_at` for activity range queries.
- Add `bodyweightEntries.by_trainee_and_created_at` for trend queries.
- Add `progressPhotos.by_trainee_and_captured_at` for timeline and comparison.
- Consider `trainingResults.completedSets` and `trainingResults.volumeKg` after submission rules are finalized.
- Avoid global dashboard counters until query patterns prove denormalization is needed.

Metric derivation:

- Weekly duration: sum `trainingResults.durationMinutes` for the chosen range.
- Weekly sets: count submitted set rows or use denormalized `completedSets` later.
- Weekly volume: sum reliable weight-and-reps volume only; do not fake volume for unsupported exercise types.
- Activity consistency: derive from `activities` linked to completed training.
- Bodyweight trend: ordered `bodyweightEntries`, possibly merged with progress photo bodyweight after product decision.
- Progress photos: signed URLs from Convex storage, filtered by coach visibility rules.

## Backend API Plan

Convex module: `convex/coachClientDashboard.ts`

Functions:

- `getClientOverview`: public query, authenticated coach only, validates managed trainee, returns header and current program summary.
- `getClientTrainingSummaryRange`: public query, authenticated coach only, returns duration, sets, reliable volume, and sessions over date range.
- `getClientActivityRange`: public query, authenticated coach only, returns activity entries for consistency view.
- `getClientBodyweightTrend`: public query, authenticated coach only, returns bounded bodyweight trend if visible.
- `getClientProgressPhotoPreview`: public query, authenticated coach only, returns recent visible progress photos with signed URLs.
- `getClientRecentTrainingResults`: public query, authenticated coach only, returns bounded recent result summaries.

Authorization:

- Derive authenticated coach server-side with Convex Auth.
- Load the signed-in coach user by token identifier.
- Require role `coach` or MVP admin-capable coach role.
- Validate `trainee.coachId === coach._id` before reading any client data.
- Do not return data for unmanaged trainees, even if the client id is known.
- Respect future progress photo visibility settings before returning photo URLs.

Performance:

- Every query must be bounded by date range or row limit.
- Avoid unbounded `.collect()`.
- Prefer indexed range queries.
- If chart data becomes expensive, introduce precomputed summaries in a later performance pass.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/user`: coach-managed trainee display types and profile summary helpers.
- `entities/statistics`: range labels, metric cards, chart data mapping, empty-state helpers.
- `entities/training-result`: result summary types and drill-down helpers.
- `entities/progress-photo`: photo preview types and visibility-aware display helpers.
- `entities/bodyweight`: bodyweight trend types and unit labels.
- `features/view-client-progress`: query binding, selected client, date range state, program filter state.
- `widgets/coach-client-dashboard`: page composition, header, filters, charts, activity map, progress photo preview, recent results table.
- `src/routes/clients.$clientId.tsx`: route candidate for client-level dashboard.
- `src/routes/analytics.client.$clientId.tsx`: optional analytics-focused route if the app separates profile and analytics.

Candidate feature-local components:

- `CoachClientHeader`
- `ClientRangeControls`
- `ClientProgressSummary`
- `ClientTrainingTrends`
- `ClientActivityMap`
- `ClientBodyweightTrend`
- `ClientProgressPhotoPreview`
- `ClientRecentResultsTable`
- `ClientDashboardEmptyState`

Use Recharts for trend charts when real data exists. Keep chart components domain-specific until the trainee and coach dashboards prove a shared chart contract.

## Implementation Plan

1. Confirm route ownership: client detail dashboard under `/clients/$clientId` or analytics detail under `/analytics/client/$clientId`.
2. Confirm bodyweight source and coach visibility.
3. Confirm progress photo coach visibility.
4. Confirm activity map style.
5. Add coach-managed trainee view-model helpers in `src/entities/user`.
6. Add shared-but-domain-specific metric helpers in `src/entities/statistics`.
7. Add required Convex indexes for date range and program filtering.
8. Add `convex/coachClientDashboard.ts` with managed-trainee authorization and bounded dashboard queries.
9. Add focused Convex tests for access control, range filtering, empty states, and metric derivation.
10. Add `features/view-client-progress` for selected range and program filter state.
11. Add `widgets/coach-client-dashboard` with dense but scannable layout.
12. Add the chosen route and link from `/clients`, `/training-results`, or `/analytics`.
13. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser checks for desktop and mobile.

## Acceptance Criteria

- Coach can open a dashboard for a managed trainee.
- Coach cannot open a dashboard for an unmanaged trainee.
- Dashboard shows client identity and current assigned program context.
- Dashboard shows date-range controls.
- Dashboard shows duration, completed sets, reliable volume, and completed sessions for the selected range.
- Dashboard shows recent training results with drill-down links.
- Dashboard shows bodyweight trend only when visible bodyweight data exists.
- Dashboard shows progress photo preview only when coach visibility permits it.
- Dashboard shows activity consistency with accessible labels.
- Empty states explain whether data is missing because no program, no results, no bodyweight, or no photos exist.
- Charts include labels, units, timeframe, and accessible fallback text.
- Coach review queries do not expose unmanaged trainee data.
- Layout remains dense but scannable and avoids overloaded dashboard noise.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: coach sees managed trainee dashboard data.
- Convex query: coach cannot see unmanaged trainee dashboard data.
- Convex query: unauthenticated user cannot read dashboard.
- Metric derivation: duration, sets, reliable volume, and sessions match seeded result data.
- Date range: metrics change when range changes.
- Empty states: no assigned program, no training results, no bodyweight, no photos.
- Browser desktop: filters, charts, and recent results table are scannable.
- Browser mobile: dashboard remains usable without pretending to be the trainee dashboard.
- Accessibility: activity map and charts do not rely on color alone.

## Open Follow-Ups

- Decide whether bodyweight is independent, attached to photos, attached to training summaries, or all three.
- Decide whether progress photos are visible to coaches by default.
- Decide activity map style: calendar intensity, completion dots, or both.
- Decide whether coach comments or approval states belong in this dashboard or separate review surfaces.
- Decide whether `/clients/$clientId` owns this dashboard or whether analytics has a separate client-detail route.
