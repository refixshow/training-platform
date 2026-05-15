---
name: feature-docs-builder
description: Use when creating or updating feature-local specs, design notes, task plans, ADRs, implementation contracts, or planning artifacts for product features in this training platform. Triggers on requests for feature docs, specs, durable product/architecture context, implementation plans, artifact contracts, feature breakdowns, or AI-ready handoff documents. Prefer docs adjacent to the owning feature/page slice, not global /docs, unless the programmer explicitly asks for a central planning document.
---

# Feature Docs Builder

Build lightweight, durable feature documentation and implementation contracts for this coaching/training platform. Treat this skill as a documentation/planning companion for feature work, not as the default executor for coding the feature end-to-end.

Do not bias toward global `/docs` or `docs/features/`. Prefer feature-adjacent docs near the owning slice, and create docs only when they preserve decisions, reduce implementation ambiguity, or help future AI/human work.

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

Do not turn this skill into a substitute for those skills. Use it to document or plan decisions those skills will implement or verify.

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
4. Produce only the docs/artifacts that earn their keep: requirements, design notes, task checklist, ADRs, or execution contracts.
5. Keep docs beside the owning page or feature once ownership is known, usually `src/features/<feature-name>/_docs/`, `src/widgets/<surface>/_docs/`, or route-adjacent when the route owns the flow.
6. Use `docs/features/` only when the programmer explicitly asks for a central planning artifact or ownership is not known yet; mark it as temporary and move essential context beside the owning slice once implementation starts.
7. Keep docs short, traceable, and easy to update in the same turn as behavior changes.

## Default Product Posture

- Trainee flows are mobile-first, simple, forgiving, and fast at the point of training.
- Coach flows can be denser, but must stay scannable with filters, tables, tabs, and drill-downs.
- Training numbers need labels, units, and context.
- Avoid Heavycoach branding, neon motivation, generic SaaS pastels, dark-heavy UI, and decorative metrics.
- Convex authorization is mandatory for role-sensitive data. UI checks are not enough.

## Documentation Contract

Prefer a concise doc plan, then real doc edits. If the user asks for implementation, write only the feature docs needed to reduce risk, then continue with code using the relevant implementation skills.

For generated plans or prompt-engineering tasks, use the artifact DSL in `references/artifact-contract.md` as the model. For normal Codex repo work, use native tools and file edits instead of emitting XML.

## Completion

Before finishing, load `references/definition-of-done.md` and report:

- What changed.
- What was verified.
- Any unmade product decision, skipped verification, or residual risk.
