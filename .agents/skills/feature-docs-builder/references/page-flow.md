# Page Flow

Use for routes, pages, dashboards, settings surfaces, onboarding, trainee screens, coach screens, and UI-heavy feature entry points.

## Context

Load `PRODUCT.md`, `DESIGN.md`, `FEATURES.md`, and `TECH.md`. Use `impeccable` for shaping or implementing UI. Use `feature-sliced-architecture` when deciding placement across `app`, `pages`, `widgets`, `features`, `entities`, and `shared`.

## Page Brief

Establish:

- User: trainee, coach, admin, or unauthenticated.
- Job: what the user is trying to complete on this page.
- Device posture: mobile-first for trainee, responsive dense desktop for coach/admin.
- Data state: loading, populated, empty, error, unauthorized, disabled, success.
- Primary action: the one action the page should make easiest.
- Secondary actions: filters, edits, drill-downs, navigation, save/cancel, export, compare.

## Design Rules

- Make the actual working surface the first screen. Do not create a marketing landing page for an app feature.
- Use light, structured, formal-sport UI aligned with `DESIGN.md`.
- Keep cards purposeful. Avoid nested cards and overloaded dashboard grids.
- Use tabs, tables, filters, segmented controls, inputs, toggles, and icon buttons where they match the workflow.
- Every metric must include label, unit, timeframe, and useful comparison or context.
- For trainee workout entry, optimize touch targets, numeric inputs, clear exercise media, and completion feedback.
- For coach management, optimize scanning, filtering, row density, and drill-down.

## Implementation Shape

Start local:

- Route/page binds data, auth, and high-level states.
- Page-local components are acceptable until reuse or complexity justifies extraction.
- Extract repeated visual primitives to `shared/ui` only when they are truly generic.
- Extract reusable product blocks to `widgets` or `features` only when ownership is clear.

Include:

- Loading skeleton or pending state.
- Empty state with the next useful action.
- Error state with recovery.
- Disabled and validation states for forms.
- Responsive behavior for mobile and desktop.
- Accessible labels, focus states, and keyboard paths.

## Verification

Run TypeScript or the repo's closest quality gate. For frontend changes, start the dev server when useful and inspect the page in the browser across mobile and desktop viewports.
