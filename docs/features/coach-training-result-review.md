# Coach Training Result Review Feature

Related entry route: `docs/features/coach-client-dashboard.md` describes
`/clients/$clientId` as the client review hub. The list and detail surfaces
documented here are the drill-down from that hub into one trainee's submitted
training history.

Related submission contract: `docs/features/training-submission.md` defines
the data this view reads (`trainingResults`, `trainingResultSetResults`,
`activities`) and the open product decisions around editing submitted results
and skipped-set semantics.

## Feature DSL

```yaml
feature: coach-training-result-review
status: planned
surface: coach-app
route_candidate_list: /clients/$clientId/results
route_candidate_detail: /clients/$clientId/results/$trainingResultId
primary_actor: coach
subject_actor: trainee
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Let coaches read exactly what a managed trainee submitted for a routine.
  - Make set-level execution scannable so coaches can spot RPE drift, missed sets, and weight changes without exporting data.
  - Anchor the review surface to the client profile so the coach stays in one client context while reviewing history.
scope:
  include:
    - Per-client training result list under /clients/$clientId/results.
    - Per-result detail under /clients/$clientId/results/$trainingResultId.
    - Date range and program filters on the list.
    - Result header: routine name, program title, completion timestamp, duration, completed sets, reliable volume.
    - Per-exercise blocks grouped by routineExerciseBlock with target vs. submitted per set.
    - Per-set fields chosen by exercise type (weight, reps, rpe, duration, distance).
    - Trainee notes and partial-submission indicator.
    - Drill-down link from list rows to detail.
    - Back link from detail to /clients/$clientId/results and breadcrumb to /clients/$clientId.
    - Loading, empty, partial-data, unauthorized, missing-result, and error states.
    - Mobile-readable layout for coaches checking results away from a desk.
  include_as_integration:
    - Link from /clients/$clientId "Ostatni trening" tile into the matching detail page.
    - Link from /clients/$clientId "Wszystkie treningi" CTA into the list.
    - Future link from coach activity map cells into the matching result detail.
    - Re-use of training-result enrichers already in convex/trainingResults.ts.
  exclude:
    - Coach comments on training submissions.
    - Editing or approving submitted results.
    - Data export.
    - Cross-client global review list at /training-results (open decision below).
    - Coach edits to trainee drafts.
    - Trend mini-charts per exercise unless cheap to add from the same set rows.
    - Previous-result comparison until the open follow-up below is resolved.
data:
  access: coach-managed-trainee-read
  source_records:
    - trainingResults
    - trainingResultSetResults
    - routines
    - routineExerciseBlocks
    - routineSetTargets
    - exercises
    - programs
    - users
  required_metrics:
    - completedAt
    - durationMinutes
    - completedSets
    - volumeKg when reliable
    - per-set submitted values matching exercise type
    - per-set target context from routine targets
  optional_metrics:
    - latest body weight context (only if dashboard already shows it)
    - notes
validation:
  coach_access: coach must manage the trainee referenced in the route param and in the result
  result_ownership: trainingResult.traineeId must match the route trainee
  units: every set field must include unit and target context
  partial_data: missing sets, missing duration, and missing volume must show explicit empty states
architecture:
  list_route_candidate: src/routes/clients.$clientId.results.index.tsx
  detail_route_candidate: src/routes/clients.$clientId.results.$trainingResultId.tsx
  list_widget: src/widgets/coach-training-result-list
  detail_widget: src/widgets/coach-training-result-detail
  feature: src/features/review-training-result
  training_result_entity: src/entities/training-result
  routine_entity: src/entities/routine
  exercise_entity: src/entities/exercise
  backend: convex/trainingResults.ts
```

## Product Decisions

- This surface is coach-facing and must show only trainees the authenticated coach manages.
- Admin capabilities are part of the coach role for MVP. Do not split admin review yet.
- The view is denser than trainee history, but stays scannable through per-exercise grouping, target context, and filters.
- Submitted training results are read-only for MVP. The coach cannot edit, correct, comment on, or approve them from this surface.
- Submitted results are the source of truth. Do not display in-progress drafts on this surface; drafts belong to the trainee logging flow only.
- The view depends on the submission contract in `training-submission.md`. Per-exercise rows must match `trainingResultSetResults` keyed by `routineExerciseBlockId` and `setIndex`.
- Skipped-set semantics are still unresolved (`FEATURES.md` open decision). Until decided, sets that are missing from `trainingResultSetResults` must render as "nie wykonane" / "brak danych", not as zeros.
- Volume is shown only when the routine contains weight-and-reps work. Do not invent volume for duration, distance, or bodyweight exercises.
- Partial submissions are valid and must be visually marked so the coach immediately sees what was completed vs. planned.
- Routes live under `/clients/$clientId/...` to keep the coach inside one client context. The existing `/training-results` stub stays as an open follow-up (see below).

## UX Shape

The coach is here for one thing: read what the trainee actually did, fast.
Layout must support both scanning a list and zooming into one session
without overloaded dashboard noise.

### List route: `/clients/$clientId/results`

- Page header: trainee identity, back link to `/clients/$clientId`, status badge (re-use `StatusBadge` from `coach-client-list`).
- Filters strip: date range (last 7 days / 4 tygodnie / 12 tygodni / wszystko), program filter when multiple programs exist for this trainee, optional routine filter.
- Results table (desktop): `Data` (completedAt), `Program`, `Rutyna`, `Czas`, `Serie ukonczone / planowane`, `Wolumen (kg)`, `RPE sr.`, akcja "Zobacz szczegoly".
- Mobile list: one card per result with date, routine, program, duration, completed sets vs. planned, optional volume, and a "Zobacz szczegoly" link.
- Empty states:
  - `No results`: nothing submitted yet for this trainee.
  - `No results in range`: filters too narrow; offer "Wyczysc filtry".
  - `No program`: warn that filters cannot include program filter.
- Loading: stable skeleton for filters and rows.
- Error / unauthorized: full-section state frame (re-use `StateFrame` pattern from `coach-client-list`).
- Pagination/cursor: bounded query for MVP; pagination is a later concern when one trainee crosses the bound.

### Detail route: `/clients/$clientId/results/$trainingResultId`

- Page header:
  - Back link "Wyniki klienta" -> `/clients/$clientId/results`.
  - Breadcrumb "Klienci / {Trainee} / Wyniki / {Data treningu}".
  - Trainee identity row (avatar, name, email).
  - Summary band: completion date/time, program title, routine name, duration, completed sets vs. planned, reliable volume, partial-submission badge when applicable.
- Notes block: trainee notes when present, with empty state copy when absent.
- Per-exercise blocks (one card per `routineExerciseBlockId`):
  - Header: exercise name, type, equipment, target summary (e.g. "3 x 8-10 powt., RPE 8, przerwa 90 sek.").
  - Set table:
    - Columns by exercise type. Re-use `getTrainingResultFields` to drive which fields render.
    - Row per planned `setIndex` ordered by `setIndex`.
    - Per cell show submitted value vs. target value when available. Use the format `"82 kg / 80 kg cel"`.
    - Mark sets without submission as "Nie wykonano" with neutral styling and clear non-color affordance (icon or label, not red).
    - Mark submitted sets that exceeded target weight or reps subtly (badge or aria label), without becoming hype UI.
  - Optional micro-context: superset chip when block is part of a superset, exercise media link when `videoUrl` exists.
- Footer:
  - "Wroc do listy" link.
  - Optional "Otworz profil klienta" link to `/clients/$clientId`.
- States:
  - Loading: header skeleton + 2-3 set-block skeletons.
  - Not found: trainingResultId does not resolve to a result for this trainee.
  - Unauthorized: result belongs to a trainee the coach does not manage.
  - Partial: at least one planned set has no submission row.
  - Missing routine/exercise: render archival fallback name when routine or exercise rows have been deleted later.

### Coach UX principles applied

- Density without dashboard noise: per-exercise blocks, not giant stat cards.
- Every number labeled and unit-correct (kg, powt., sek., m, RPE 1-10).
- Non-color affordances for completion, partial, and target-vs-actual variance.
- Touch targets large enough for coaches reading on phone during a session.
- Layout stays light; avoid stacked card shadows and decorative tone.

## Data Model Plan

The schema already supports this view; do not introduce new tables. Relevant
sources:

```ts
trainingResults: defineTable({
  completedAt: v.number(),
  completedSets: v.optional(v.number()),
  durationMinutes: v.optional(v.number()),
  notes: v.optional(v.string()),
  programId: v.optional(v.id('programs')),
  routineId: v.id('routines'),
  traineeId: v.id('users'),
  volumeKg: v.optional(v.number()),
})
  .index('by_trainee_and_completed_at', ['traineeId', 'completedAt'])
  .index('by_trainee_and_program', ['traineeId', 'programId'])

trainingResultSetResults: defineTable({
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  exerciseId: v.id('exercises'),
  reps: v.optional(v.number()),
  routineExerciseBlockId: v.optional(v.id('routineExerciseBlocks')),
  rpe: v.optional(v.number()),
  setIndex: v.number(),
  trainingResultId: v.id('trainingResults'),
  weightKg: v.optional(v.number()),
}).index('by_training_result', ['trainingResultId'])

routineExerciseBlocks, routineSetTargets, exercises, programs, routines, users
```

Indexes that are required and already exist:

- `trainingResults.by_trainee_and_completed_at` (range queries for the list).
- `trainingResults.by_trainee_and_program` (program filter on the list).
- `trainingResultSetResults.by_training_result` (set rows for the detail).
- `routineSetTargets.by_routine_exercise_block` (target context per block).

No schema changes are required for MVP. Two open follow-ups that may inform
later iterations are listed at the bottom of this doc.

Target vs. actual reconciliation:

- Detail handler returns set rows enriched with `exercise`, plus the routine
  blocks and their targets for the source routine.
- Frontend merges blocks and targets with submitted set rows by
  `(routineExerciseBlockId, setIndex)` and renders one row per planned set.
- When a set row has no `routineExerciseBlockId` (legacy submissions), group
  it under "Inne serie" at the end of the relevant exercise block by
  `exerciseId`, or under a "Serie poza planem" section if no exercise match
  exists.

## Backend API Plan

Convex module: `convex/trainingResults.ts` (existing). The required functions
already exist:

- `listForCoachReview({ traineeId, limit })`: filters by managed trainee, range
  filtering is currently `limit`-bounded only. Returns `enrichResultSummary`
  rows.
- `getForCoachReview({ trainingResultId })`: validates managed trainee and
  returns `getResultDetail` (result + set rows enriched with exercise).

Required extensions before this view ships:

- Extend `listForCoachReview` so the list route can filter by date range
  (`completedAt` between `rangeStart` and `rangeEnd`) and program
  (`programId`). Both filters must run server-side using
  `by_trainee_and_completed_at` and `by_trainee_and_program`.
- Extend `getForCoachReview` (or add `getCoachReviewResultWithPlan`) so the
  detail handler returns:
  - the routine blocks + targets for `result.routineId` at read time, and
  - the per-set submitted rows enriched with exercise context.
  This lets the frontend render target vs. actual without a second round trip
  and without leaking unmanaged-trainee data through routine fetches.
- Keep enrichment helpers (`enrichResultSummary`, `getResultDetail`,
  `getRoutineBlocks`) reusable across trainee and coach review queries to avoid
  divergence.

Authorization rules (already enforced by `requireCoachAdmin` +
`requireManagedTrainee` in the existing handlers; preserve them):

- Derive authenticated coach server-side; never trust client `coachId`.
- For list: require `traineeId.coachId === coach._id`.
- For detail: validate result ownership matches the route trainee param and
  the coach manages that trainee. The route trainee param must be the
  authoritative input; the result's `traineeId` is a cross-check, not a
  fallback.
- Unauthenticated requests must fail; non-coach roles must fail.
- Do not expose drafts (`trainingDrafts`) through any coach query.

Performance and limits:

- Bound list queries by reasonable limit (existing `MAX_REVIEW_RESULTS = 120`)
  and short date ranges by default.
- Bound detail set rows by existing `MAX_SUBMITTED_SETS = 240`.
- Avoid unbounded `.collect()` anywhere on review handlers.
- If list filtering needs cursor pagination in v2, add it without breaking the
  existing `limit` contract.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/training-result`: re-use existing schema, field labels, unit
  helpers (`getTrainingResultFields`, `getTrainingResultFieldLabel`,
  `getTrainingResultFieldUnit`, `formatTrainingDate`, `formatTrainingDuration`,
  `formatVolumeKg`). Extend only if new display helpers are clearly reusable.
- `entities/routine`: target summary helpers (existing
  `createEmptySetTarget`, `getSetTargetFields`) for target-vs-actual labels.
- `entities/exercise`: exercise type display helpers (already used by logging
  panel).
- `features/review-training-result`: query binding, filter state for date
  range and program, result detail loader, partial-data and unauthorized
  handling.
- `widgets/coach-training-result-list`: list page composition (header,
  filters, table, mobile list, empty states, skeletons).
- `widgets/coach-training-result-detail`: detail page composition (header,
  summary band, notes block, per-exercise blocks, footer).
- `src/routes/clients.$clientId.results.index.tsx`: list route.
- `src/routes/clients.$clientId.results.$trainingResultId.tsx`: detail route.

Domain component candidates:

- `CoachTrainingResultListHeader`
- `CoachTrainingResultFilters`
- `CoachTrainingResultTable`
- `CoachTrainingResultMobileList`
- `CoachTrainingResultSummary`
- `CoachTrainingExerciseBlock`
- `CoachTrainingSetRow`
- `CoachTrainingPartialBadge`
- `CoachTrainingNotesPanel`
- `CoachTrainingResultEmptyState`

UI rules from `DESIGN.md` and `AGENTS.md`:

- No raw `className` passthrough on design-system primitives. Use variants.
- Re-use `Card`, `CardBody`, `CardHeader`, `Input`, `StatusBadge` patterns
  already in `widgets/coach-client-list` to keep coach surfaces consistent.
- Light surfaces with measured contrast; no dark mode hacks.
- Tabular numerics (`tabular-nums`) for kg, powt., sek., m.
- Each block scannable on mobile; no horizontal scroll on phones for set
  tables - fall back to stacked rows on small screens.

State and data fetching:

- Use `@convex-dev/react-query` `convexQuery` like other coach widgets.
- Filters live in URL search params so coaches can share or refresh without
  losing state. Use TanStack Router search params with Zod validation.
- Detail page loads via route param. Show stable skeletons until data lands.
- No optimistic mutations on this surface; read-only.

## Implementation Plan

1. Confirm scope decisions captured in this doc are still valid before code
   starts (especially the partial-submission rendering rules and the
   "no skipped-set semantics yet" follow-up).
2. Add server-side filter args to `listForCoachReview` in
   `convex/trainingResults.ts`: optional `rangeStart`, `rangeEnd`, `programId`,
   using existing indexes.
3. Add `getCoachReviewResultWithPlan` (or extend `getForCoachReview`) in
   `convex/trainingResults.ts` to return routine blocks + targets alongside
   set rows for the detail view.
4. Add focused Convex tests:
   - Authorization (unmanaged trainee, unauthenticated, non-coach).
   - Range filtering on the list.
   - Program filtering on the list.
   - Detail returns plan + actual joined correctly, including when sets are
     missing from `trainingResultSetResults`.
5. Add `features/review-training-result` with filter state, query bindings,
   and result-detail loader. Validate search params with Zod.
6. Add `widgets/coach-training-result-list` with header, filters, desktop
   table, mobile list, and all states.
7. Add `widgets/coach-training-result-detail` with header, summary band, notes
   block, per-exercise blocks rendered from plan-vs-actual, and footer.
8. Add routes `src/routes/clients.$clientId.results.index.tsx` and
   `src/routes/clients.$clientId.results.$trainingResultId.tsx`. Confirm
   TanStack Start file-route conventions match the existing
   `clients.$clientId.tsx`.
9. Wire entry points from `widgets/coach-client-list`:
   - Replace the placeholder "Zobacz statystyki" affordance on
     `LastTrainingCell` so coaches can click directly into the result detail
     when a `latestTrainingResult._id` is available.
   - Add a "Wszystkie treningi" link in `ClientDetailContent` to the list
     route.
10. Update `src/app/coach-shell/model/coach-navigation.ts` only if the
    programmer decides to surface a top-level entry; otherwise keep the entry
    nested under client.
11. Run Convex codegen/checks, `npm run typecheck`, `npm run test`,
    `npm run build`, and browser checks on mobile and desktop.
12. Run `graphify update .` after code lands.

## Acceptance Criteria

- Coach can open `/clients/$clientId/results` only for a managed trainee.
- Coach cannot open the list or detail for an unmanaged trainee.
- The list shows submitted results in descending `completedAt` order.
- The list supports a date range filter that maps to
  `by_trainee_and_completed_at`.
- The list supports a program filter that maps to `by_trainee_and_program`.
- Each list row shows date, program, routine, duration, completed sets vs.
  planned, reliable volume, and a link to the matching detail page.
- Empty states explain whether no results exist, filters are too narrow, or
  the trainee has no program assigned.
- The detail page shows trainee identity, completion date/time, program,
  routine, duration, completed sets vs. planned, reliable volume, partial
  badge when applicable, and trainee notes.
- The detail page groups set rows by `routineExerciseBlockId` in routine
  order with the planned exercise sequence preserved.
- Each set row renders only fields that match the exercise type and includes
  units.
- Each set row shows submitted value alongside the target context from
  `routineSetTargets`.
- Sets that were not submitted render as "Nie wykonano" with non-color
  affordance and remain in the planned order.
- Volume is shown only when at least one weight-and-reps set exists.
- The detail page has a back link to the list and a breadcrumb to the
  client.
- Layout remains light, scannable, and avoids stacked card shadows or
  decorative metrics.
- Mobile renders the set tables as stacked rows without horizontal scroll.
- All Convex review queries reject unmanaged-trainee reads.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex query: `listForCoachReview` with `traineeId` returns only that
  trainee's results.
- Convex query: range filter narrows results to the requested
  `completedAt` window.
- Convex query: program filter narrows results to the requested
  `programId`.
- Convex query: `listForCoachReview` rejects unmanaged-trainee read.
- Convex query: `getCoachReviewResultWithPlan` returns routine blocks +
  targets joined with submitted set rows.
- Convex query: detail rejects unmanaged-trainee read.
- Convex query: detail rejects a `trainingResultId` whose `traineeId` does
  not match the route trainee param.
- Convex query: detail correctly returns sets that are missing
  `routineExerciseBlockId` (legacy) without crashing.
- Browser desktop: list filters update results without losing scroll.
- Browser desktop: detail page reads cleanly with planned-vs-actual joined.
- Browser mobile: list renders as cards; detail renders set rows stacked.
- Accessibility: partial-submission, completed, and "nie wykonano" affordances
  do not rely on color alone.
- Accessibility: focus order moves through filters, list rows, and back link
  predictably.
- Authorization: unauthenticated user cannot reach the routes; non-coach role
  is redirected or rejected by the route guard.

## Open Follow-Ups

- Decide whether trainees can edit submitted training results. If yes, this
  surface needs a "edited at" indicator and ADR.
- Decide whether coach comments belong on this surface or on a separate review
  flow. If yes, this doc should be updated and a `comment-training-result`
  feature created.
- Decide skipped-set semantics: explicit "skipped" rows, absent rows only, or
  skip reasons. Until decided, render absent rows as "Nie wykonano" and avoid
  zeroing values.
- Decide whether `/training-results` should become a cross-client review list,
  be repurposed, or be removed. The current stub at
  `src/routes/training-results.tsx` should not block this view but must be
  resolved before coach navigation surfaces it.
- Decide if previous-result comparison (one prior submission of the same
  routine alongside the current one) becomes part of MVP; the current scope
  excludes it.
- Decide if a small per-exercise trend rail (last 3-5 sessions) is worth the
  cost; current scope excludes it to avoid dashboard creep.
- Decide whether assigned programs are snapshots or live references (parent
  open decision in `FEATURES.md`); rendering target context depends on it
  staying stable for historical results.

---

## Design Brief (confirmed)

Produced via `impeccable shape` on 2026-05-15 and confirmed by the
programmer. Carry this brief into `impeccable craft` as the design contract.

### 1. Feature Summary

Two coach-facing screens nested in the client profile: training result list
at `/clients/$clientId/results` and training result detail at
`/clients/$clientId/results/$trainingResultId`. Goal: in 10 minutes before
a session, on a phone, the coach should answer "what exactly did the client
do" without asking the client and without exporting data. Read-only in MVP.

### 2. Primary User Action

- List: at a glance answer "when last and what volume vs. previous", and
  tap to drill into a session when something looks off.
- Detail: see plan vs. actual per exercise and per set (weight, reps, RPE,
  duration/distance) with explicit "not done" marks for missing sets.

### 3. Design Direction

- **Color strategy**: Restrained. Tinted neutrals plus one quiet accent for
  links and selected filters. No metric tiles with gradients, no side-stripe
  borders, no good/bad color signaling on results (anti-Strava).
- **Theme**: Light, forced by the scene sentence: "Coach in a bright gym
  hall, 10 minutes before a session, holds a phone in one hand, quickly
  reviews the client's last training, between greeting clients and starting
  the timer." Bright ambient light demands high contrast, large numerics, no
  hover-dependent affordances, touch targets ≥44 px, no decorative motion.
- **Anchors**:
  - Apple Fitness Activity Rings detail: numeric confidence, "done / planned"
    framing, no hype.
  - Garmin Connect activity detail: training-log discipline, target vs.
    actual as the default frame, compact sections.
  - Hevy / Strong workout history: genre-closest comparison; take plan-vs-
    actual layout and tabular numerics, drop social/PR overlays.
- Linear from DESIGN.md stays as a project-level typography anchor; this
  surface does not borrow Linear UI sharpness directly.

### 4. Scope

- Fidelity: high-fi, one direction.
- Breadth: list + detail.
- Interactivity: brief plus one static phone-first detail mockup as
  supporting artifact.
- Time intent: planning artifact for `impeccable craft`; no code yet.

### 5. Layout Strategy

#### List, phone-first

- Sticky page header with client name, back arrow to `/clients/$clientId`,
  segmented control for date range (`7 dni`, `4 tygodnie`, `12 tygodni`,
  `Wszystko`). Default range `4 tygodnie`.
- One 1px quiet-line separator under the header. No tile, no card, no
  weekly summary above the list (anti-SaaS).
- Vertical stack of full-width rows. No card grid. 1px quiet line between
  rows. Each row has three typographic zones:
  - Label line: short day-of-week + date + program (support ink, tabular).
  - Title line: routine name, stronger weight.
  - Numerics line: `32 min · 18/20 serii · 4 280 kg +8%`, tabular numerics,
    `·` separator. Delta volume inline with sign only, no color.
- Whole row is the tap target. No separate trailing action element.
- Program chip filter appears only when the client has ≥2 programs in
  history.
- Desktop: same stack, max-width ~880 px, centered. `@container ≥ 720px`
  switches numerics to a second column. Never becomes a table.

#### Detail, phone-first

- Sticky header with back arrow ("Wyniki") plus mini breadcrumb
  ("Klient → Wyniki"). One line only.
- Above-the-fold summary (no cards):
  - Date and time `pon., 13 maja, 18:24` at display size, calm weight.
  - Routine and program (title + label).
  - Three inline facts on one line: `Czas 32 min · Serie 18/20 · Wolumen
    4 280 kg`. Tabular, `·` separator, micro-label under each value.
    `Niedokończona` badge joins as a third inline element only when
    completed sets are fewer than planned.
- Notes block rendered only if notes exist. No empty placeholder when
  absent.
- Stack of per-exercise sections (no cards, no nested cards, no side
  stripes):
  - Header: exercise name (title) plus a one-line plan summary, e.g.
    `Plan: 4 × 8-10 powt. @ RPE 8, przerwa 90 sek.`
  - Sets on mobile: stacked rows, one per `setIndex`. Submitted values
    followed by target context with `→` separator. Sets without
    submission render as `—` with `Nie wykonano` micro-label; row weight
    drops to support ink; non-color affordance.
  - Sets on desktop: compact mini-table with 4-6 columns depending on
    `exercise.type`.
  - Vertical rhythm: larger padding-y between sections than between sets,
    explicit rhythm rather than uniform grid.
- Footer: single inline link `Otwórz profil klienta`. No big CTA, this is
  read-only.

#### Anti-spreadsheet rules applied

- Typography hierarchy ratio ≥1.5 across display → title → body → label.
- Variable vertical rhythm between sections and inside sets.
- No vertical rules inside the set table; only horizontal quiet lines.

### 6. Key States

- List loading: skeleton stack, 5-6 placeholder rows, opacity pulse only.
- List loaded.
- List empty in range: `Brak treningów w wybranym zakresie.` plus a
  `Pokaż wszystkie` link.
- List empty ever: `{Imię} nie wysłał jeszcze żadnego treningu.` plus a
  link to `/assignments`.
- List, no active program: support-ink banner over the list, program
  filter inactive.
- Detail loading: header skeleton plus 2 exercise sections of skeletons.
- Detail loaded.
- Partial submission: `Serie 18/20` plus inline `Niedokończona` badge
  (neutral tone, not red). Missing sets render as `—` with `Nie wykonano`.
- No notes: notes block absent.
- Legacy set without `routineExerciseBlockId`: trailing section
  `Serie poza planem`.
- Deleted exercise: archival fallback `Cwiczenie usunięte z biblioteki`.
- Deleted routine: detail header shows `Rutyna usunięta`; sections show
  only executed sets without plan context.
- Unauthorized: full `StateFrame` reuse, copy
  `Nie masz dostępu do wyników tego klienta.`
- Not found: full `StateFrame`, copy `Ten trening nie istnieje lub należy
  do innego klienta.` plus back link.
- Network error: `StateFrame` error tone, retry link.
- Reduced motion: all fade-ins become instant.

### 7. Interaction Model

- Entry from `/clients/$clientId` via "Wszystkie treningi" link or via
  "Ostatni trening" drill-down on the dashboard.
- List filters live in URL search params (`?range=7d|4w|12w|all`,
  `?programId=…`). Default `range=4w`.
- Whole list row is tap target. Mobile min-height 64 px, desktop 56 px.
  No hover preview.
- Detail back link returns to the list with filters preserved (URL).
- "Otwórz profil klienta" returns to `/clients/$clientId`, not to the
  list of clients.
- No modals, no slide-overs, no tooltips required to understand content.
- Motion: skeleton → content at 180 ms ease-out-quart, opacity only.
  Segmented control switches at <100 ms, background-color only. Reduced
  motion makes all transitions instant.
- Keyboard: Tab through segmented control, program chip, then each row;
  Enter on row drills in. Tab through back link and "Otwórz profil
  klienta" on detail. Visible focus rings.
- Touch: ≥44×44 px for every interactive target.

### 8. Content Requirements

- Page header list: `Wyniki — {Imię}`.
- Segmented control: `7 dni · 4 tygodnie · 12 tygodni · Wszystko`.
- Row label: `pon. 13 maja · {Program title}`.
- Row title: `{Routine name}`.
- Row metrics: `32 min · 18/20 serii · 4 280 kg +8%`. Delta omitted when
  not reliable.
- Empty in range: `Brak treningów w wybranym zakresie.`
- Empty ever: `{Imię} nie wysłał jeszcze żadnego treningu.`
- No-program banner: `Klient nie ma aktywnego programu.`
- Detail header date: `pon., 13 maja 2026, 18:24`.
- Detail facts micro-labels: `Czas`, `Serie`, `Wolumen`.
- Partial badge: `Niedokończona`.
- Exercise plan summary (template depends on type): for weight_reps,
  `Plan: 4 × 8-10 powt. @ RPE 8, przerwa 90 sek.`
- Set submitted: `82 kg × 9 powt. @ RPE 8 → cel: 80 kg × 8-10 @ RPE 8`.
- Set not done: `Seria 4 — nie wykonano`.
- Notes block heading: `Notatka klienta` (only when present).
- Unknown exercise: `Cwiczenie usunięte z biblioteki`.
- Footer link: `Otwórz profil klienta`.
- Authorization errors: reuse `coach-client-list` copy.

Realistic ranges: 15-30 set rows per detail (medium scale). Default 4-week
list typically shows 8-15 rows. `Wszystko` may show 50-150 rows; the
existing Convex limit `MAX_REVIEW_RESULTS = 120` is the MVP cap.
Pagination is a follow-up.

### 9. Recommended References (for craft)

- `reference/spatial-design.md`: spacing rhythm, list → detail hierarchy,
  anti-grid.
- `reference/typography.md`: 1.5+ ratio, tabular nums, "Numbers Stay Calm".
- `reference/color-and-contrast.md`: bright-light mobile contrast.
- `reference/interaction-design.md`: segmented control, chip filter, touch
  targets, URL-driven state.
- `reference/cognitive-load.md`: 80% scan use case, signal vs. decoration.
- `reference/responsive-design.md`: phone-first → desktop, `@container`.
- `reference/motion-design.md`: minimal fade, reduced-motion fallback.

### 10. Open Questions to resolve in craft

1. Delta volume baseline: same-routine previous session, or rolling mean
   of last N? Default assumption: same-routine previous session.
2. Delta volume reliability threshold: minimum count of `weight_reps` /
   `assisted_bodyweight` sets in both sessions before delta is shown.
3. TanStack Start route file naming: confirm
   `clients.$clientId.results.index.tsx` plus
   `clients.$clientId.results.$trainingResultId.tsx` matches existing
   `clients.$clientId.tsx` convention.
4. Sticky detail header on mobile: default non-sticky in MVP; revisit if
   coaches complain on long sessions.
5. Skipped-set semantics: doc-level open follow-up; brief renders missing
   sets as `Nie wykonano`. Explicit skip rows are a future product
   decision.

### Visual artifact

A single high-fi mobile detail mockup is produced alongside this brief as
a supporting reference. The mockup is a direction test, not a final spec.


