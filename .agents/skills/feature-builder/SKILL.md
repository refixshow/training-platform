---
name: feature-builder
description: Use when building, shaping, planning, reviewing, or refactoring complete product features, page flows, dashboards, CRUD surfaces, trainee or coach workflows, backend-backed UI, or full-stack vertical slices in this training platform. Triggers on requests to create a page, feature, flow, MVP slice, form workflow, dashboard section, route, Convex-backed capability, or "Chef/Bolt-style" implementation plan with artifacts, references, and execution contracts. Coordinates product context, design quality, feature-sliced architecture, Atomic Design, TanStack Start, Convex, tests, and verification.
---

# Feature Builder

Build complete product features end-to-end for this coaching/training platform. Treat this skill as an orchestrator: load the right project docs, select the needed local skills, make only justified architectural decisions, implement the vertical slice, and verify it.

## Preflight

Before product, UX, design, architecture, or implementation decisions:

1. Read `PRODUCT.md`, `DESIGN.md`, `FEATURES.md`, and `TECH.md`.
2. If `graphify-out/GRAPH_REPORT.md` exists, read it before broad architecture or multi-file investigation.
3. For Convex code, read `convex/_generated/ai/guidelines.md` first.
4. Use existing app patterns before introducing a new structure.
5. Ask the programmer before deciding any open product decision listed in `AGENTS.md`, `FEATURES.md`, or `TECH.md`.

## Skill Routing

Use these local skills when the task touches their territory:

- `impeccable`: any UI, UX, visual hierarchy, page flow, dashboard, form surface, empty state, mobile trainee flow, coach dense view, polish, or browser iteration.
- `feature-sliced-architecture`: route/page/widget/feature/entity/shared placement, public APIs, slice boundaries, or cross-feature sharing.
- `atomic-design-system`: reusable React UI primitives, design-system wrappers, typed variants, token-driven components, or component decomposition.
- `convex` and related Convex skills: schema, queries, mutations, auth, migrations, authorization, indexes, realtime data, or backend performance.

Do not turn this skill into a substitute for those skills. Use it to coordinate them into a shippable feature.

## Workflow

1. Classify the request:
   - `page-flow`: route, screen, landing-like app page, dashboard, settings, onboarding, trainee screen, coach screen.
   - `feature-slice`: reusable product capability such as logging workouts, assigning programs, building routines, uploading progress photos.
   - `backend-capability`: Convex schema/query/mutation/auth/API work with little or no UI.
   - `refactor-hardening`: improve an existing feature, remove coupling, add states, fix edge cases, or prepare for production.
2. Load the relevant reference:
   - Page or UI-heavy work: `references/page-flow.md`.
   - Product feature work: `references/feature-slice.md`.
   - Convex or auth-heavy work: `references/backend-capability.md`.
   - Feature-local specs, rules, tasks, or ADRs: `references/spec-driven-docs.md`.
   - Artifact-style planning or generator prompt design: `references/artifact-contract.md`.
   - Final checks: `references/definition-of-done.md`.
3. Identify unclear decisions early. Ask only when the decision is product/architecture-significant and cannot be recovered from repo context.
4. Implement vertically where possible: route/page, UI states, data access, validation, authorization, and tests/verification should line up.
5. Keep first implementations close to the owning page or feature until reuse, ownership, or complexity justifies extraction.
6. Add feature-local documentation only when it helps future AI/human work: requirements, design notes, task checklist, and ADRs for durable decisions.
7. Verify with the smallest meaningful quality gate, then broaden when the blast radius is larger.

## Default Product Posture

- Trainee flows are mobile-first, simple, forgiving, and fast at the point of training.
- Coach flows can be denser, but must stay scannable with filters, tables, tabs, and drill-downs.
- Training numbers need labels, units, and context.
- Avoid Heavycoach branding, neon motivation, generic SaaS pastels, dark-heavy UI, and decorative metrics.
- Convex authorization is mandatory for role-sensitive data. UI checks are not enough.

## Implementation Contract

Prefer a concise plan, then real edits. Do not stop at proposals when the request asks for implementation.

For generated plans or prompt-engineering tasks, use the artifact DSL in `references/artifact-contract.md` as the model. For normal Codex repo work, use native tools and file edits instead of emitting XML.

## Completion

Before finishing, load `references/definition-of-done.md` and report:

- What changed.
- What was verified.
- Any unmade product decision, skipped verification, or residual risk.
