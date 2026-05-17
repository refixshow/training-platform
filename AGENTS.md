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

### Feature-local docs

Detailed feature specs, implementation plans, and ADRs should usually live beside the owning slice, for example `src/features/<feature-name>/_docs/`, `src/widgets/<surface>/_docs/`, or near the route/page that owns the flow.

Use global `docs/features/` only when the programmer explicitly asks for a central planning artifact or ownership is not known yet. Treat central docs as temporary and move the essential context beside the owning slice once implementation starts.

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

### feature-docs-builder

Use when creating or updating feature-local specs, design notes, task plans, ADRs, implementation contracts, or AI-ready handoff documents.

Important rules:

- Read `PRODUCT.md`, `DESIGN.md`, `FEATURES.md`, and `TECH.md` before product, UX, design, or architecture decisions.
- Use this skill for docs and planning contracts; use implementation skills for code changes.
- Load the relevant reference in `.agents/skills/feature-docs-builder/references/` for page flows, feature slices, backend capabilities, artifact contracts, and definition of done.
- For non-trivial features, keep lightweight docs near the owning slice, usually `src/features/<feature-name>/_docs/` with `spec.md`, optional `design.md`, `tasks.md`, and ADRs only for durable decisions.
- Do not default to `/docs` or `docs/features/`; use those only when the programmer explicitly asks for a central planning artifact.
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
- Program routines use a flexible ordered list for MVP. Do not build week/day scheduling unless the programmer asks to promote that model.
- Detailed feature specs usually live beside the owning feature/page slice; keep `FEATURES.md` compact and strategic. Use `docs/features/` only when explicitly requested as a central planning area.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
