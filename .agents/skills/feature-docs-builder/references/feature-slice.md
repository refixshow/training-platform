# Feature Slice

Use for complete product capabilities such as exercise management, routine building, program assignment, workout logging, training result review, statistics, or progress photos.

## Slice Brief

Define:

- Actor: trainee, coach, admin.
- Capability: the verb phrase the user completes.
- Data owned: records created, read, updated, deleted, or derived.
- Permissions: who can do what, enforced in Convex.
- UI surfaces: list, detail, create/edit form, review, stats, confirmation.
- State lifecycle: draft, saved, assigned, submitted, reviewed, archived, deleted.
- Open decisions: anything called out in `FEATURES.md`, `TECH.md`, or `AGENTS.md`.

## Vertical Slice Order

Prefer this implementation order when building a new full-stack feature:

1. Domain model and validation shape.
2. Convex schema/indexes/queries/mutations with authorization.
3. Route/page structure and loading/error/empty states.
4. Forms and interaction flow.
5. Reusable UI extraction only where justified.
6. Feature-local docs from `spec-driven-docs.md` only when the feature has enough complexity or decisions to preserve.
7. Tests, typecheck, browser verification, and graph update.

For narrower UI-only work, skip backend steps only after confirming the data already exists or the task is intentionally mocked.

## Architecture Placement

Use `feature-sliced-architecture` for ambiguous boundaries.

Defaults:

- Route-level composition belongs near the route/page.
- User actions belong in `features/<verb-noun>` when reusable or complex.
- Core concepts belong in `entities/<entity>` when multiple pages/features need the same model.
- Large composed sections belong in `widgets/<surface>`.
- Generic design-system primitives belong in `shared/ui`.
- Generic non-UI helpers belong in focused `shared/lib/<purpose>` modules.

Avoid creating many slices at once for an early single-use feature. The first version may stay local if that keeps ownership clear.

## Feature Documentation

Use `spec-driven-docs.md` when a feature is more than a tiny UI tweak and durable context will prevent future drift. Prefer a small doc pack beside the owning slice:

```text
src/features/<feature-name>/
├── _docs/
│   ├── spec.md
│   ├── design.md
│   ├── tasks.md
│   └── adr/
└── ...
```

Create only the files that earn their keep. A simple feature may need no docs; a technical or product-sensitive feature may need `spec.md`, `design.md`, or one ADR. Do not default to `docs/features/` unless the programmer asks for a central planning artifact.

## Data and Security

- Role checks must live in Convex queries and mutations, not just in React.
- Trainees only access their assigned programs, own training results, own photos, and own progress.
- Coaches only access users and training data they are allowed to manage.
- Admin behavior needs a product decision if the role/permission model is not settled.
- Zod should describe user-facing validation where practical; Convex still validates and authorizes server-side.

## UX Expectations

- Trainee feature: reduce fields at the moment of action, make submission forgiving, confirm completion.
- Coach feature: support repeated work, filters, batch-like scanning, and drill-down.
- Admin feature: favor clarity, auditability, and avoiding accidental destructive changes.

## Verification

Run the relevant typecheck/test/lint command. Manually verify the main happy path plus at least one empty/error or permission-sensitive state when possible.
