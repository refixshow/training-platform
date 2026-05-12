<!-- intent-skills:start -->
# Skill mappings - load `use` with `npx @tanstack/intent@latest load <use>`.
skills:
  - when: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
    use: "@tanstack/devtools#devtools-app-setup"
  - when: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
    use: "@tanstack/devtools#devtools-marketplace"
  - when: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
    use: "@tanstack/devtools#devtools-plugin-panel"
  - when: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
    use: "@tanstack/devtools#devtools-production"
  - when: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
    use: "@tanstack/devtools-event-client#devtools-bidirectional"
  - when: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
    use: "@tanstack/devtools-event-client#devtools-event-client"
  - when: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
    use: "@tanstack/devtools-event-client#devtools-instrumentation"
  - when: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
    use: "@tanstack/devtools-vite#devtools-vite-plugin"
  - when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
    use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  - when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
    use: "@tanstack/react-start#react-start"
  - when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
    use: "@tanstack/react-start#react-start/server-components"
  - when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
    use: "@tanstack/router-core#router-core"
  - when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
    use: "@tanstack/router-core#router-core/auth-and-guards"
  - when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
    use: "@tanstack/router-core#router-core/code-splitting"
  - when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
    use: "@tanstack/router-core#router-core/not-found-and-errors"
  - when: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
    use: "@tanstack/router-core#router-core/path-params"
  - when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
    use: "@tanstack/router-core#router-core/ssr"
  - when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
    use: "@tanstack/router-plugin#router-plugin"
  - when: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
    use: "@tanstack/start-client-core#start-core"
  - when: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
    use: "@tanstack/start-client-core#start-core/auth-server-primitives"
  - when: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
    use: "@tanstack/start-client-core#start-core/deployment"
  - when: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
    use: "@tanstack/start-client-core#start-core/execution-model"
  - when: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
    use: "@tanstack/start-client-core#start-core/middleware"
  - when: "createServerFn (GET/POST), inputValidator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
    use: "@tanstack/start-client-core#start-core/server-functions"
  - when: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
    use: "@tanstack/start-client-core#start-core/server-routes"
  - when: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
    use: "@tanstack/start-server-core#start-server-core"
  - when: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
    use: "@tanstack/virtual-file-routes#virtual-file-routes"
<!-- intent-skills:end -->

# AGENTS

## Project Context

This project is a coaching/training platform inspired by Heavycoach-style functionality, but it must not copy Heavycoach branding or visual identity directly.

When a task is broad, unclear, or asks to solve an unknown product/design/architecture problem, ask the programmer for clarification before making large decisions. This is especially important for feature boundaries, shared code limits, product behavior, and UI direction.

## Learning Loop

When the user corrects a repeated mistake or clarifies a stable preference:

1. Classify the correction as one of:
   - personal preference
   - repo rule
   - folder-specific rule
   - reusable workflow/skill
   - one-off task detail

2. Persist it in the right place:
   - personal preference -> update the nearest `AGENTS.md`
   - repo rule -> update the nearest `AGENTS.md`
   - folder-specific rule -> update or create an `AGENTS.md` in that folder
   - reusable workflow/skill -> create or update a skill
   - one-off task detail -> keep it only in the current task docs or plan

3. Briefly state what was learned and where it was saved.

4. Before finishing, verify the new instruction is reflected in future work.

## Important Files

### PRODUCT.md

Strategic product context.

Read this before making product, UX, design, or feature decisions. It defines:

- Product register: `product`.
- Primary users: coaches and trainees.
- Product purpose.
- Brand personality.
- Anti-references.
- Design principles.
- Accessibility expectations.

### DESIGN.md

Starter design-system direction.

Read this before building or changing UI. It defines:

- Light 60-30-10 color direction.
- Formal-sport typography direction.
- Motion direction: responsive feedback without theatrical animation.
- Visual references: Apple Fitness, Garmin Connect, Linear.
- Anti-references: neon motivation, influencer fitness aesthetics, generic SaaS pastels, heavy dark UI.

This file is currently a seed. Re-run `impeccable document` after real UI exists to extract actual tokens and components.

### FEATURES.md

Functional product scope. Keep this file strategic and compact. Do not add detailed implementation plans, per-feature DSLs, task breakdowns, or long resolved-decision logs here.

Read this before implementing product behavior. It defines:

- Roles: trainee, coach, admin.
- Core data models: exercise, muscle group, routine, program, user, training result, progress photo, activity.
- MVP feature set.
- Later features.
- Trainee and coach UX requirements.
- Open product decisions.

### docs/features/

Detailed feature specs and implementation plans.

Use this folder for feature-builder style documents, including:

- Feature DSL.
- Implementation plan.
- UX states.
- Data contracts.
- Architecture boundaries.
- Test checklist.

Prefer adding or updating one focused file in `docs/features/` over expanding `FEATURES.md`.

### TECH.md

Technical architecture and stack.

Read this before implementation or architecture changes. It defines:

- Stack: TypeScript, React, TanStack Start, Vite, Tailwind CSS, shadcn/ui, Convex, Convex Auth, Formik, Zod, Recharts, Graphify, Vercel.
- Feature-sliced architecture direction.
- Atomic Design and design-system API rules.
- Convex backend ownership.
- Auth and authorization expectations.
- Form and validation choices.
- Deployment target.
- Quality gates.

### graphify-out/

Knowledge graph output for the project, when present.

Before answering architecture or codebase questions:

- Read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files first.
- For multiple-file review or investigation tasks, use Graphify first to identify relevant files and relationships before raw file reads or grep.
- For cross-module questions like "how does X relate to Y", prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep.
- After modifying code files in a session, run `graphify update .` to keep the graph current.

If `graphify-out/` does not exist yet, continue with normal code search and mention that graph context was unavailable.

## Local Skills

Local project skills live in `.agents/skills`.

### feature-builder

Use when building complete product features, page flows, dashboards, CRUD surfaces, route-level pages, backend-backed UI, or full-stack vertical slices.

Important rules:

- Read `PRODUCT.md`, `DESIGN.md`, `FEATURES.md`, and `TECH.md` before product, UX, design, or architecture decisions.
- Use this skill as an orchestrator with `impeccable`, `feature-sliced-architecture`, `atomic-design-system`, and Convex skills instead of duplicating them.
- Load the relevant reference in `.agents/skills/feature-builder/references/` for page flows, feature slices, backend capabilities, artifact contracts, and definition of done.
- For non-trivial features, keep lightweight feature-local docs near the owning slice, usually `src/features/<feature-name>/_docs/` with `spec.md`, optional `design.md`, `tasks.md`, and ADRs only for durable decisions.
- Ask the programmer before resolving open product decisions or ambiguous architecture boundaries.

### impeccable

Use for frontend design, UX shaping, visual critique, polishing, design documentation, and UI implementation guidance.

Important commands:

- `impeccable teach`: creates or refreshes product context.
- `impeccable document`: creates or refreshes design-system documentation.
- `impeccable shape`: shapes UX/UI before implementation.
- `impeccable craft`: shape then build a feature end-to-end.

### atomic-design-system

Use when creating, reviewing, or refactoring React UI components into Atomic Design.

Important rules:

- Design-system components must not expose public `className`.
- Use variants, tokens, typed props, render props, children, and compound/composable APIs.
- Keep component files small by splitting types, variants, constants, utils, tests, and exports.
- Not every component belongs in the design system. Feature/domain components may be less restrictive.

### feature-sliced-architecture

Use when placing code in `app`, `pages`, `widgets`, `features`, `entities`, or `shared`.

Important rules:

- Use Feature-Sliced Design pragmatically, not rigidly.
- Start from pages and user flows.
- Extract shared code only when reuse, ownership, or complexity justifies it.
- Ask the programmer before deciding ambiguous slice boundaries, sharing limits, or import strictness.

### convex and related Convex skills

Use for Convex backend work, schema design, queries, mutations, auth, migrations, and performance.

Available Convex skills:

- `convex`: routes general Convex requests to the right skill.
- `convex-quickstart`: adding Convex to an app or creating a new Convex setup.
- `convex-setup-auth`: Convex Auth setup and auth integration.
- `convex-create-component`: reusable Convex components.
- `convex-migration-helper`: planning and running Convex migrations.
- `convex-performance-audit`: query/index/performance review.

Before substantial Convex work, prefer installing or refreshing official Convex AI guidance with `npx convex ai-files install` when project state allows it.

## Architecture Defaults

Prefer this direction:

- `app`: routing, providers, app shell, TanStack Start integration.
- `pages`: route-level pages.
- `widgets`: larger composed page sections.
- `features`: user actions and product capabilities.
- `entities`: core domain concepts.
- `shared`: design-system UI, generic utilities, config, route constants, and reusable low-level helpers.
- `convex`: schema, queries, mutations, auth integration, and backend logic.

Do not over-slice early. Single-use code can stay local until reuse or complexity makes extraction worthwhile.

## UI Defaults

- Build trainee flows mobile-first and simple.
- Build coach flows with more detail, but keep them scannable.
- Use shadcn/ui as accessible primitives.
- Use Tailwind through tokens and variants, not arbitrary visual escape hatches in design-system APIs.
- Avoid overloaded dashboards.
- Avoid decorative charts and metrics without context.
- Labels, units, empty states, error states, and focus states matter.

## Backend Defaults

- Convex owns database schema, queries, mutations, realtime behavior, and server-side authorization.
- Convex Auth owns authentication.
- Role checks must be enforced in Convex functions, not only in the UI.
- Trainees must only access their own assigned programs, submissions, photos, and progress.
- Coaches must only access users and training data they are allowed to manage.

## Decision Rules

Ask the programmer before deciding:

- Whether assigned programs are snapshots or live references.
- Whether trainees can edit submitted training results.
- Whether progress photos are visible to coaches by default.
- Where bodyweight should be stored.
- Ambiguous feature-sliced boundaries.
- Moving code into `shared`.
- Adding strict architecture lint rules.

Resolved MVP product decisions:

- Admin capabilities are part of the coach role for MVP. Split admin into a separate role only after the programmer asks for that boundary.
- Public/self-service account creation always creates a trainee account. Coach/admin roles are assigned manually in the database for now; do not expose a role selector in signup UI or trust a client-provided signup role.
- Exercise videos are links only for MVP.
- Exercise photos and optional media fields should not block exercise creation in MVP.
- Detailed feature specs live in `docs/features/`; keep `FEATURES.md` compact and strategic.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
