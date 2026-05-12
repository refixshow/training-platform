# Add Muscle Group Feature

## Feature DSL

```yaml
feature: add-muscle-group
status: planned
surface: coach-app
route: /muscle-groups
primary_actor: coach
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Build the first taxonomy management surface for training programming.
  - Let the coach create muscle groups that are immediately usable in exercise forms.
scope:
  include:
    - Muscle group list shell.
    - Empty state with create action.
    - Create muscle group form.
    - Formik form state.
    - Zod validation.
    - Convex create mutation.
    - Convex bounded list query.
    - Loading, saving, validation, error, and success states.
  include_if_low_risk:
    - Inline rename/edit.
    - Delete only when the group is not referenced by exercises.
  exclude:
    - Muscle group categories.
    - Drag-and-drop sort order.
    - Visibility controls.
    - Separate admin role.
    - Bulk import.
data:
  ownership: global
  required_fields:
    - name
  optional_fields:
    - sortOrder
validation:
  name: trimmed, non-empty, max 80
  uniqueness: case-insensitive duplicate guard
  delete: blocked when referenced by exercises
architecture:
  route: src/routes/muscle-groups.tsx
  widget: src/widgets/muscle-group-admin
  create_feature: src/features/create-muscle-group
  edit_feature: src/features/edit-muscle-group
  muscle_group_entity: src/entities/muscle-group
  backend: convex/muscleGroups.ts
```

## Product Decisions

- For MVP, admin capabilities are handled by the coach role. Do not introduce a separate admin role yet.
- Muscle groups are global taxonomy records in MVP. Do not add `ownerCoachId`.
- Muscle groups can be used as both primary and secondary groups for exercises.
- Deleting a muscle group should be conservative. If any exercise references it as primary or secondary, block deletion and explain why.
- Sort order is allowed by the schema but should not become a drag-and-drop workflow in this pass unless the programmer asks for it.

## UX Shape

The `/muscle-groups` page should be a compact coach/admin setup workspace. It should feel like maintaining taxonomy, not like a statistics dashboard.

Primary layout:

- Page header: `Grupy miesniowe`, short operational description, primary `Dodaj grupe` action.
- Toolbar: search by name, optional reset action.
- Content: dense list/table of muscle groups.
- Empty state: explain that groups are needed before exercises can be classified, with one `Dodaj grupe` action.
- Create flow: inline card/panel using the shared `Card`, `Input`, and `Button` primitives. Avoid modal-first design.

Create form:

- Single required `name` field.
- Optional helper copy explaining examples such as `Klatka piersiowa`, `Plecy`, `Dwuglowe uda`.
- Save button disabled while saving.
- Success message confirms the group is available in exercise forms.

Edit/delete shape:

- Edit can be inline row rename or a small inline panel. Prefer inline row rename if it stays readable.
- Delete should be secondary and visually quiet.
- Delete confirmation is only needed because taxonomy deletion can affect existing exercises. If delete is blocked by references, show a non-destructive error state instead.

## Data Model Plan

Current `convex/schema.ts` already has `muscleGroups`.

Recommended schema direction:

```ts
muscleGroups: defineTable({
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  name: v.string(),
  normalizedName: v.string(),
  sortOrder: v.optional(v.number()),
})
  .index('by_name', ['name'])
  .index('by_normalized_name', ['normalizedName'])
```

Notes:

- `normalizedName` supports duplicate checks without table scans.
- Existing rows would need a backfill if this schema is applied after data exists.
- If the current dev deployment has no production data, this can be a direct schema tightening.
- Keep list queries bounded with `.take(n)` or pagination.
- Role checks belong in Convex mutations. UI-only checks are not enough.

## Backend API Plan

Convex module: `convex/muscleGroups.ts`

Functions:

- `list`: public query, bounded, ordered by `name` or `sortOrder` when later introduced.
- `create`: public mutation, requires coach/admin, trims name, validates duplicate by `normalizedName`, inserts timestamps.
- `update`: public mutation, requires coach/admin, validates existing id, trims name, duplicate-checks against other groups, patches `updatedAt`.
- `remove`: public mutation, requires coach/admin, blocks if any exercise uses the group as primary or secondary.

Authorization:

- Authenticated coach can manage global muscle groups in MVP.
- Trainee cannot create, edit, or delete muscle groups.
- Keep the role boundary behind `requireCoachAdmin(ctx)` so a future admin split is isolated.

Reference checks for delete:

- Primary references can use `exercises.by_primary_muscle_group`.
- Secondary references are currently stored as an array. Convex cannot index array membership directly with the current schema, so MVP delete blocking has two reasonable options:
  - Conservative first pass: block delete if primary references exist, and defer secondary-aware delete until a join table or derived index exists.
  - Safer product pass: do not ship delete yet; ship create/list/edit first.

Recommendation: ship create/list/edit first, defer delete unless we add a proper reference model.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/muscle-group`: display types, Zod schema, normalization helper, labels if needed.
- `features/create-muscle-group`: create form, Formik binding, submit mapping.
- `features/edit-muscle-group`: inline rename behavior if included in the same pass.
- `widgets/muscle-group-admin`: page composition, toolbar, list, empty state, create flow placement.
- `src/routes/muscle-groups.tsx`: route-level binding only.

Use the shared design-system primitives already extracted:

- `shared/ui/button`
- `shared/ui/input`
- `shared/ui/card`

Do not create new shared primitives unless the muscle group screen reveals a repeated generic pattern that add-exercise also needs.

## Implementation Plan

1. Add muscle group validation helpers in `src/entities/muscle-group`.
2. Decide whether schema can be tightened directly or needs a migration/backfill for `createdAt` and `normalizedName`.
3. Update `convex/schema.ts` with timestamps and `normalizedName` if safe.
4. Expand `convex/muscleGroups.ts` with `create`, `update`, and possibly `remove`.
5. Add focused form validation tests for name required, max length, and duplicate normalization.
6. Add `features/create-muscle-group` with Formik and shared UI primitives.
7. Add `widgets/muscle-group-admin` with toolbar, empty state, list, loading state, error state, and create panel.
8. Replace placeholder `/muscle-groups` route with the widget.
9. Run `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`.
10. Run `npm run typecheck`, `npm run test`, `npm run build`, and browser sanity checks for `/muscle-groups`.

## Acceptance Criteria

- Coach can open `/muscle-groups`.
- Empty taxonomy shows a clear empty state and one `Dodaj grupe` action.
- Coach can create a valid muscle group with only a name.
- Name is trimmed before validation and storage.
- Empty name is rejected.
- Duplicate names are rejected case-insensitively.
- Created group appears in the list and in exercise form muscle group options.
- Loading and saving states are visible and stable.
- Error state preserves entered values.
- Convex mutation derives identity server-side and enforces coach/admin access.
- Trainee or unauthenticated user cannot create or edit muscle groups.

## Test Checklist

- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex codegen against `dev:grandiose-cat-547`
- Form validation: missing name, overly long name, duplicate normalized name.
- Create mutation: valid minimum payload.
- Update mutation if included: rename to valid unique name, reject duplicate.
- Authorization: unauthenticated or trainee cannot mutate.
- Browser: `/muscle-groups` renders empty/list states and create flow on mobile and desktop.

## Open Follow-Ups

- Whether delete ships in MVP depends on secondary-reference safety.
- Sort order exists as a possible schema field but should not become UI until the programmer asks for ordering.
- A future admin role can take over this surface without changing the route-level UX much.
