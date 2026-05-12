# Tech

## Stack

The application should be built with:

- **TypeScript** as the primary language.
- **React** for UI.
- **TanStack Start** as the application framework.
- **Vite** as the build and development toolchain used through the frontend stack.
- **Tailwind CSS** for styling.
- **shadcn/ui** for accessible, composable UI primitives.
- **Convex** for backend, database, server functions, and realtime data.
- **Convex Auth** for authentication.
- **Formik** for complex form state.
- **Zod** for schema validation.
- **Recharts** for statistics and progress charts.
- **Graphify** for dependency graph analysis and AI-assisted optimization.
- **Vercel** for deployment.

## Architecture

The project should use a full-stack React architecture with TanStack Start on the frontend and Convex as the backend/data layer.

The architecture should move toward a feature-sliced structure. Product capabilities should be grouped around features and domains rather than scattered only by technical type. Shared primitives, design-system components, schemas, and infrastructure helpers can live in shared layers, but coach, trainee, admin, exercise, routine, program, training result, statistics, and progress photo workflows should have clear feature ownership.

High-level shape:

- `app` routes and UI are handled by TanStack Start.
- UI components are built from shadcn/ui primitives and local product-specific components.
- Styling uses Tailwind tokens aligned with `DESIGN.md`.
- Persistent data and backend mutations live in Convex.
- Authentication is handled through Convex Auth.
- Shared validation schemas use Zod where possible.
- Complex create/edit flows use Formik with Zod-backed validation.
- Charts and analytics views use Recharts.
- Deployment targets Vercel.

## Frontend

### React

React should be used for all interactive product surfaces:

- Trainee workout flow.
- Coach dashboard.
- Exercise library.
- Routine builder.
- Program builder.
- User assignment views.
- Progress photo views.
- Statistics and activity views.

### TanStack Start

TanStack Start should own routing, app structure, page-level loading patterns, and full-stack route behavior where useful.

Expected route groups:

- Public/auth routes.
- Trainee app routes.
- Coach app routes.
- Admin or settings routes.

The route structure should keep trainee and coach workflows separate enough that the trainee experience stays simple while coach screens can expose more density.

### Vite

Vite is the expected local development and bundling toolchain. Keep the project compatible with fast local iteration, hot reload, and Vercel deployment.

## UI System

### Tailwind CSS

Tailwind should be the main styling layer. Tokens should be derived from `DESIGN.md` once implementation starts.

Use Tailwind for:

- Layout.
- Spacing.
- Responsive behavior.
- Typography.
- State styles.
- Color tokens.

Avoid hard-coded one-off values unless the component is intentionally bespoke.

### shadcn/ui

shadcn/ui should provide the base accessible primitives for:

- Buttons.
- Inputs.
- Selects.
- Dialogs when truly needed.
- Tabs.
- Tables.
- Dropdowns.
- Popovers.
- Forms.
- Toasts.
- Cards where cards are the right affordance.

Product-specific components should wrap or compose shadcn/ui rather than forking primitives unnecessarily.

### Component Direction

The design system should follow Atomic Design:

- **Atoms:** primitive controls and display pieces such as button, input, label, badge, avatar, icon button, separator, spinner, typography, and field message.
- **Molecules:** small composed patterns such as search field, stat tile, exercise metadata row, set input group, media picker, filter chip group, and form field.
- **Organisms:** larger reusable product sections such as exercise editor, routine exercise block, workout set table, program week planner, progress photo slider, activity map, and coach stat panel.
- **Templates:** reusable page structures for trainee workout screens, coach management screens, admin screens, and analytics pages.
- **Pages:** route-level implementations that bind templates to data, auth, loading, empty, and error states.

Design-system components must be driven by variants, tokens, and typed configuration props. They should not accept raw `className` escape hatches as part of their public API.

Allowed design-system customization patterns:

- Variant props such as `variant`, `size`, `tone`, `density`, `intent`, and `state`.
- Token-backed props where the value is constrained to known design tokens.
- Boolean configuration props for defined behavior.
- Render props when the component needs to expose state while preserving structure.
- `children` for composition where content ownership belongs to the caller.
- Compound or composable component APIs when the relationship between parts is intentional and documented.

Disallowed for core design-system components:

- Public `className` props.
- Arbitrary Tailwind class passthrough.
- Ad hoc style props.
- One-off visual overrides that bypass variants or tokens.
- Feature-specific data assumptions inside primitive components.

Not every component belongs in the design system. Domain and feature-specific components are allowed and expected. These components can be less restrictive when they are tied to a specific workflow, data shape, or route.

Domain components should still use design-system primitives internally, but they may accept feature-specific props, compose layout more freely, and own product logic. For example, `WorkoutLoggingPanel`, `RoutineExerciseEditor`, `ProgramWeekPlanner`, and `CoachProgressOverview` can be feature components rather than strict design-system primitives.

Expected product components:

- Exercise card or exercise row.
- Exercise media block.
- Muscle group selector.
- Routine exercise editor.
- Set target editor.
- Program week/day planner.
- Workout logging panel.
- Training result summary.
- Progress photo slider.
- Activity map.
- Coach stat panel.
- Trainee profile summary.

## Backend and Data

### Convex

Convex should own:

- Database schema.
- Queries.
- Mutations.
- Server-side authorization checks.
- Realtime data updates.
- File or media metadata where applicable.

Core Convex domains:

- Users.
- Coaches and trainees.
- Exercises.
- Muscle groups.
- Routines.
- Programs.
- Program assignments.
- Training sessions or scheduled workouts.
- Training results.
- Activities.
- Progress photos.
- Bodyweight entries.

### Data Ownership

Every coach-owned record should have clear ownership and authorization rules. A coach should only see users, programs, routines, results, and photos they are allowed to access.

Trainees should only see their own assigned programs, own submissions, own progress, and any shared coach feedback.

## Authentication

Authentication should use Convex Auth.

Auth needs to support:

- Signed-in trainee users.
- Signed-in coach users.
- Admin permissions or admin role.
- Role-aware routing.
- Server-side authorization in Convex functions.

Role checks must not live only in the UI. Convex queries and mutations should enforce access rules.

MVP decision:

- Admin capabilities are handled by the coach role for now. Keep the implementation simple enough to split admin into a separate role later.

## Forms and Validation

### Formik

Formik should be used for complex forms such as:

- Exercise create/edit.
- Routine builder.
- Program builder.
- User assignment forms.
- Coach-side profile or settings forms.

Simple inline controls can use local React state when Formik would add unnecessary overhead.

### Zod

Zod should define validation schemas for:

- Exercise payloads.
- Routine payloads.
- Program payloads.
- Training result submission.
- Progress photo metadata.
- Bodyweight entries.
- Admin-managed muscle groups.

Use shared schemas where practical so frontend validation and backend validation do not drift.

## Charts and Statistics

Recharts should be used for:

- Weekly duration.
- Weekly volume.
- Weekly sets.
- Bodyweight trend.
- Activity and adherence summaries.
- Coach-side trainee progress views.

Charts must stay readable and functional. Avoid decorative charting where a simple stat, table, or trend line communicates better.

## Media

Exercise media:

- Exercise photos are optional in MVP and must not block creating an exercise.
- Exercise videos are external links only in MVP.
- Uploaded exercise videos are a later feature unless explicitly promoted to MVP.

Progress photos:

- Trainees upload photos.
- Photos are visible in chronological views and slider comparisons.
- Coach visibility should be controlled by product permissions.

Storage implementation details should be decided when the Convex file/media approach is chosen.

## Deployment

The deployment target is Vercel.

Deployment requirements:

- Vercel project configured for the TanStack Start app.
- Convex environment configured for production.
- Environment variables managed through Vercel and Convex.
- Preview deployments should be usable for testing UI and product flows.

Expected environments:

- Local development.
- Vercel preview.
- Production.

## Graphify

Graphify should be used to generate and inspect dependency graphs for:

- Codebase structure.
- Feature dependencies.
- Data model relationships.
- AI-assisted navigation and optimization.
- Identifying overly coupled modules.
- Supporting future refactors.

Suggested usage:

- Run Graphify after the first implementation pass.
- Re-run after major feature additions.
- Use graph output to keep coach, trainee, admin, Convex, UI, and shared schema boundaries clear.

## Code Organization

Initial organization should separate concerns clearly while moving toward feature-sliced boundaries:

- App routes and route-level data loading.
- Shared UI primitives.
- Product-specific components.
- Form schemas and validation.
- Convex schema, queries, and mutations.
- Chart and statistics helpers.
- Auth and authorization helpers.
- Shared types.

Preferred direction:

- `app` for routes, providers, route shells, and TanStack Start integration.
- `shared` for design-system primitives, generic utilities, shared types, shared validation helpers, and cross-feature UI.
- `entities` for core domain concepts such as user, exercise, muscle group, routine, program, training result, progress photo, and activity.
- `features` for user-facing capabilities such as logging a workout, building a routine, assigning a program, uploading a progress photo, reviewing training results, and managing muscle groups.
- `widgets` or equivalent composed sections for larger page blocks such as coach dashboard panels, trainee current workout, statistics overview, and program planner.
- `convex` for database schema, queries, mutations, auth integration, and backend logic, organized so feature ownership remains visible.

Avoid mixing coach-only logic into trainee components. Shared training concepts should live in shared modules; role-specific workflows should stay separate.

## Quality Gates

Before a feature is considered done:

- TypeScript passes.
- Relevant forms have Zod validation.
- Convex mutations enforce authorization.
- Mobile trainee flow is tested manually.
- Coach dense views remain scannable.
- Charts have labels, units, and empty states.
- Loading, empty, error, and disabled states exist where needed.
- Accessibility basics are covered: labels, keyboard navigation, contrast, focus states.

## Technical Open Decisions

- Exact TanStack Start project structure.
- Convex Auth provider setup.
- Media upload strategy for exercise photos and progress photos.
- Whether assigned programs are snapshots or live references to program templates.
- Whether bodyweight is stored independently, attached to progress photos, attached to training summaries, or all three.
- Exact Tailwind token names once colors and typography are implemented.
- Whether Formik is used for workout logging or only for coach/admin builder forms.
