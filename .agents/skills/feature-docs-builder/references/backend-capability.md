# Backend Capability

Use for Convex schema, queries, mutations, auth, server functions, data migrations, media metadata, statistics, and authorization-heavy work.

## Required Context

Before editing Convex code:

1. Read `convex/_generated/ai/guidelines.md`.
2. Use the relevant Convex skill:
   - `convex-setup-auth` for auth, identity, roles, permissions.
   - `convex-migration-helper` for schema changes and backfills.
   - `convex-performance-audit` for slow reads, indexes, subscriptions, or contention.
   - `convex-create-component` for reusable backend modules.
3. Read `FEATURES.md` and `TECH.md` for product ownership and open decisions.

## Backend Brief

Define:

- Tables and indexes involved.
- Query and mutation entry points.
- Authenticated identity and role requirements.
- Ownership rules for coach, trainee, and admin.
- Validation rules and expected error shape.
- Realtime needs and expected subscription fanout.
- Migration/backfill needs if existing data changes.

## Convex Defaults

- Convex owns database schema, queries, mutations, realtime behavior, and server-side authorization.
- Mutations validate input and enforce ownership.
- Queries avoid returning records outside the caller's permission boundary.
- Indexes are chosen for expected access patterns, not added blindly.
- High-frequency events or computed stats should be designed for read amplification and write contention.

## Product Decisions To Ask

Ask before implementing when relevant:

- Admin as separate role or coach permission.
- Assigned programs as snapshots or live references.
- Trainees editing submitted training results.
- Coach visibility of progress photos by default.
- Bodyweight storage location.
- Exercise videos as links or uploads in MVP.

## Verification

Run Convex codegen/typecheck or the closest available repo command. For authorization-sensitive work, verify at least one allowed and one denied path through tests or targeted review.
