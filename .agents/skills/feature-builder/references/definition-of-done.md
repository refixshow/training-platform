# Definition Of Done

Use before final response for any feature/page/backend change.

## Product

- The feature matches `PRODUCT.md`, `FEATURES.md`, and known open decisions.
- Feature-local docs exist when the implementation introduced durable product behavior, non-obvious architecture, or AI-relevant context.
- Trainee flows are mobile-first and clear at the point of action.
- Coach flows are scannable, dense only where useful, and avoid dashboard noise.
- Labels, units, empty states, error states, and success states are present where relevant.

## Architecture

- Code follows existing repo patterns and keeps first implementations close to ownership.
- Feature-sliced boundaries are intentional; ambiguous moves into `shared`, `entities`, `features`, or `widgets` were confirmed with the programmer.
- Design-system components do not expose public `className` escape hatches.
- Domain components use design-system primitives but may own product-specific props and behavior.

## Backend

- Convex functions enforce authorization server-side.
- Queries and mutations respect coach/trainee/admin ownership boundaries.
- Schema/index changes are compatible with existing data or have a migration plan.
- Validation exists at the appropriate UI and backend boundaries.

## UI

- Loading, empty, error, disabled, focus, and responsive states exist where needed.
- Mobile and desktop layouts do not overlap or resize unpredictably.
- Charts and metrics include labels, units, timeframe, and context.
- Visual direction stays light, structured, practical, and non-generic.

## Verification

Run the smallest meaningful set:

- TypeScript/typecheck for code changes.
- Relevant tests when behavior changes.
- Convex codegen/checks for backend changes.
- Browser inspection for UI changes.
- `graphify update .` after modifying code files when Graphify is available.

If a check cannot run, state that clearly in the final response with the reason.
