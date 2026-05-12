# Coach Client List Route Feature

## Feature DSL

```yaml
feature: coach-client-list
status: planned
surface: coach-app
route_candidate: /clients
detail_route_candidate: /clients/$clientId
primary_actor: coach
subject_actor: trainee
business_goal:
  - Give coaches one scannable place to find managed trainees.
  - Let coaches move from a client row into client detail statistics.
  - Reuse the same training source data that powers the trainee dashboard, with coach authorization.
scope:
  include:
    - Coach client list route.
    - Managed trainee rows.
    - Search or filter by client identity.
    - Current assignment summary per trainee.
    - Recent training activity summary per trainee.
    - Last submitted training result date.
    - Lightweight status for missing program or missing results.
    - Row action/link to client detail.
    - Optional redirect behavior when a client is preselected.
    - Loading, empty, error, unauthorized, and partial-data states.
  include_as_integration:
    - Link to /clients/$clientId detail dashboard.
    - Link to assignment flow when a trainee has no program.
    - Link from coach navigation.
    - Future link from training result review surfaces.
  exclude:
    - Editing client profile.
    - Creating users unless separately scoped.
    - Coach comments.
    - Training result editing or approval.
    - Advanced analytics.
    - Data export.
data:
  access: coach-managed-trainees-read
  source_records:
    - users
    - programAssignments
    - programs
    - trainingResults
    - activities
  detail_source_records:
    - trainingResultSetResults
    - bodyweightEntries
    - progressPhotos
  required_list_fields:
    - trainee identity
    - current assigned program where present
    - latest training result date where present
    - recent activity count
    - quick status
  detail_reuse_fields:
    - weeklyDurationMinutes
    - weeklyCompletedSets
    - weeklyVolumeKg where reliable
    - recentTrainingResults
    - activityEntries
    - bodyweightTrend where visible
    - progressPhotoTimeline where visible
validation:
  coach_access: coach can only list trainees where users.coachId equals authenticated coach id
  no_trainee_id_trust: detail queries validate the route clientId server-side
  units: every metric shown in list or detail includes unit and timeframe
  partial_data: missing assignment/results/photos/bodyweight renders explicit state
architecture:
  list_route: src/routes/clients.tsx
  detail_route_candidate: src/routes/clients.$clientId.tsx
  list_widget: src/widgets/coach-client-list
  detail_widget: src/widgets/coach-client-dashboard
  list_feature: src/features/browse-coach-clients
  detail_feature: src/features/view-client-progress
  user_entity: src/entities/user
  statistics_entity: src/entities/statistics
  training_result_entity: src/entities/training-result
  backend_list: convex/coachClients.ts
  backend_detail: convex/coachClientDashboard.ts
```

## Product Decisions

- Yes, the coach should see trainee training results for managed trainees.
- The coach must not use `traineeDashboard.getOverview`; that query is trainee-owned and derives the trainee from the authenticated session.
- Coach access needs a separate Convex query that derives the authenticated coach server-side and checks `trainee.coachId === coach._id`.
- The client list is a coach operating surface, so it can be denser than the trainee dashboard while staying scannable.
- The client detail dashboard can show statistics that correspond to the trainee's own perspective, but with coach context, filters, and drill-downs.
- Progress photo visibility and bodyweight source remain open product decisions. The list should not imply those policies.

## UX Shape

The `/clients` route is the coach's entry point for choosing a trainee to review. It should answer: who needs attention, who has recent activity, who has no assigned program, and where do I go next?

Primary layout:

- Header: `Klienci`, short count summary, optional action to assign/create client later.
- Toolbar: search by name/email and quick filters.
- Client list: table on desktop, stacked rows on mobile.
- Each row: trainee identity, current program, latest result, recent activity count, status, detail action.
- Empty state: no managed trainees yet, route toward assignment or client setup.

Desktop list columns:

- Client.
- Current program.
- Last training.
- Recent activity, e.g. last 7 or 28 days.
- Status.
- Action: `Zobacz statystyki`.

Mobile list order:

1. Client identity.
2. Status.
3. Current program.
4. Last training and activity.
5. Detail action.

## Detail Navigation And Redirect

Preferred behavior:

- `/clients` renders the list by default.
- Clicking a client row navigates to `/clients/$clientId`.
- `/clients/$clientId` renders the coach client dashboard documented in `docs/features/coach-client-dashboard.md`.

Optional redirect behavior:

- `/clients?clientId=<id>` may redirect to `/clients/$clientId` after validating the param shape.
- If the coach has exactly one managed trainee, `/clients` may offer a prominent first row/action rather than auto-redirect. Auto-redirect can be disorienting on an operating surface.
- If a stale or unmanaged `clientId` is provided, render an access-safe not-found/no-access state instead of redirecting to another trainee.

Do not redirect from `/clients` to the trainee-owned `/dashboard`. The coach detail route needs its own authorization and coach-facing layout.

## Reuse Strategy

Reuse is possible, but at the right layer.

Reuse safely:

- Metric derivation helpers for duration, completed sets, reliable volume, date ranges, and labels.
- View-model shapes for activity days, recent result summaries, bodyweight points, and progress photo previews.
- Small presentational sections once they are parameterized by role, density, and permissions.
- Recharts chart primitives after both trainee and coach dashboards prove the same contract.
- Empty-state copy patterns and metric formatting utilities.

Do not reuse directly:

- `convex/traineeDashboard.ts` public query for coach access.
- The whole `TraineeDashboard` widget for coach detail. It is mobile-first and trainee-action oriented.
- Trainee primary actions such as `Rozpocznij trening`.
- Trainee-only assumptions about photo visibility or bodyweight ownership.

Recommended extraction path:

1. Keep the first coach list local in `src/widgets/coach-client-list`.
2. Build `convex/coachClients.ts` for list rows and `convex/coachClientDashboard.ts` for detail stats.
3. Extract reusable metric functions to `src/entities/statistics` only after coach and trainee code both need them.
4. Extract training result summary helpers to `src/entities/training-result`.
5. Keep role-specific composition in separate widgets: `trainee-dashboard` and `coach-client-dashboard`.

## Backend API Plan

Convex module: `convex/coachClients.ts`

Functions:

- `listManagedClients`: public query, authenticated coach/admin only, returns bounded list rows.
- `getClientListFilters`: optional public query for filter metadata if needed later.

List row shape:

```ts
type CoachClientListRow = {
  trainee: {
    _id: Id<'users'>
    name?: string
    email?: string
  }
  currentAssignment: null | {
    _id: Id<'programAssignments'>
    assignedAt: number
    program: {
      _id: Id<'programs'>
      title: string
      durationWeeks: number
    }
  }
  latestTrainingResult: null | {
    _id: Id<'trainingResults'>
    completedAt: number
    routineName?: string
    durationMinutes?: number
    completedSets?: number
    volumeKg?: number
  }
  recentActivity: {
    rangeLabel: string
    completedTrainingCount: number
  }
  status:
    | 'ready_for_review'
    | 'no_program'
    | 'no_results'
    | 'inactive_recently'
}
```

Authorization:

- Use `requireCoachAdmin(ctx)`.
- Query `users.by_coach` using the authenticated coach id.
- Filter to role `trainee`.
- For every row, only read assignments/results where `traineeId` belongs to that managed trainee.
- Detail route queries must repeat authorization; the list route is not a security boundary.

Performance:

- Bound trainees by list limit or pagination.
- Bound latest result per trainee with `trainingResults.by_trainee_and_completed_at`.
- Bound activity summaries by a recent range.
- Avoid broad dashboard aggregates in the list. Full statistics belong on `/clients/$clientId`.

## Frontend Architecture

Recommended placement:

- `src/routes/clients.tsx`: list route.
- `src/routes/clients.$clientId.tsx`: detail route.
- `src/widgets/coach-client-list`: list composition, table/row layout, states.
- `src/widgets/coach-client-dashboard`: detail statistics surface.
- `src/features/browse-coach-clients`: search/filter state if it grows beyond local route state.
- `src/features/view-client-progress`: detail range/program filters.
- `src/entities/user`: trainee identity display helpers.
- `src/entities/statistics`: metric labels, ranges, activity day mapping, formatting.
- `src/entities/training-result`: result summary and drill-down helpers.

Initial implementation can keep the list widget local and avoid premature extraction into `shared`.

## Implementation Plan

1. Keep `docs/features/coach-client-dashboard.md` as the detail dashboard spec.
2. Add `/clients` list route implementation over the existing placeholder route.
3. Add `/clients/$clientId` route candidate for detail dashboard.
4. Add `convex/coachClients.ts` with `listManagedClients`.
5. Add `convex/coachClientDashboard.ts` or adapt the existing plan into a single `getClientOverview` query.
6. Reuse existing indexes:
   - `users.by_coach`
   - `programAssignments.by_trainee`
   - `trainingResults.by_trainee_and_completed_at`
   - `activities.by_trainee_and_created_at`
7. Add focused tests for managed/unmanaged trainee access.
8. Build list UI with desktop table and mobile stacked rows.
9. Link each row to `/clients/$clientId`.
10. Add optional query-param redirect only after the basic list/detail flow works.
11. Run Convex codegen, typecheck, tests, build, and browser checks.

## Acceptance Criteria

- Coach can open `/clients` and see only managed trainees.
- Coach cannot infer unmanaged trainees from the list or detail route.
- Client rows show identity, assignment state, latest result state, and recent activity context.
- Empty state explains how the coach gets clients into the list.
- Every row has a clear `Zobacz statystyki` path to `/clients/$clientId`.
- `/clients/$clientId` shows coach-authorized stats based on the same training result source data as the trainee dashboard.
- The detail route does not expose the trainee-owned dashboard endpoint.
- Metrics include units and timeframe.
- Missing program, missing results, missing bodyweight, and missing photos are explicit partial states.
- Desktop view is dense and scannable; mobile remains usable.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: coach sees managed trainees only.
- Convex query: coach cannot fetch unmanaged trainee detail.
- Convex query: unauthenticated user cannot list clients.
- Convex query: trainee cannot list coach clients.
- Browser desktop: client table scans cleanly.
- Browser mobile: rows stack without losing status/action context.
- Accessibility: row actions have clear names; status is not color-only.

## Open Follow-Ups

- Decide whether `/clients` should ever auto-redirect when there is exactly one trainee.
- Decide whether the client detail route lives only at `/clients/$clientId` or also has an analytics alias.
- Decide progress photo coach visibility.
- Decide bodyweight source.
- Decide whether client creation/invitation belongs on `/clients` or a separate settings/admin flow.
