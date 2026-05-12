# Add Exercise Feature

## Feature DSL

```yaml
feature: add-exercise
status: planned
surface: coach-app
route: /exercises
primary_actor: coach
mvp_role_model:
  admin_capabilities: coach
  future_split: admin_role
business_goal:
  - Build the first global exercise library surface.
  - Let the coach create exercises that can later be used by routine builder.
scope:
  include:
    - Exercise library list shell.
    - Empty state with create action.
    - Create exercise form.
    - Formik form state.
    - Zod validation.
    - Convex create mutation.
    - Convex bounded list query.
    - Loading, saving, validation, error, and success states.
  exclude:
    - Edit exercise.
    - Delete exercise.
    - Exercise alternatives.
    - Private coach libraries.
    - Uploaded exercise videos.
    - Routine builder integration.
data:
  ownership: global
  required_fields:
    - name
    - type
    - equipment
    - primaryMuscleGroupId
  optional_fields:
    - customEquipment
    - secondaryMuscleGroupIds
    - instructions
    - photoStorageId
    - videoUrl
media:
  exercise_photo: optional
  exercise_video: link_only
validation:
  name: trimmed, non-empty, max 120
  type: enum
  equipment: enum
  customEquipment: required only when equipment is other
  primaryMuscleGroupId: required
  secondaryMuscleGroupIds: no primary duplicate
  videoUrl: optional url
architecture:
  route: src/routes/exercises.tsx
  widget: src/widgets/exercise-library
  create_feature: src/features/create-exercise
  exercise_entity: src/entities/exercise
  muscle_group_entity: src/entities/muscle-group
  backend: convex/exercises.ts
```

## Product Decisions

- For MVP, admin capabilities are handled by the coach role. A separate admin role can be introduced later.
- Exercises are global in MVP. Do not add coach-private ownership until the product asks for private or shared libraries.
- Exercise video support is a link field only.
- Exercise photo and media fields are optional. They should not block exercise creation.

## UX Shape

The `/exercises` page should become a practical coach workspace, not a decorative dashboard.

Primary layout:

- Page header: `Cwiczenia`, short operational description, primary `Dodaj cwiczenie` action.
- Toolbar: search by name, type filter, equipment filter, primary muscle group filter.
- Content: table or dense list of exercises.
- Empty state: clear explanation and one `Dodaj cwiczenie` action.
- Create flow: inline workspace panel or page-level form. Avoid modal-first design for the initial version.

Create form sections:

- Basics: name, exercise type, equipment, custom equipment when needed.
- Classification: primary muscle group, secondary muscle groups.
- Media: optional photo, optional video URL.
- Instructions: ordered list of steps, allowed to be empty in MVP.

## Data Model Plan

Current `convex/schema.ts` already has `exercises`, but the MVP should tighten the contract.

Recommended schema direction:

```ts
exercises: defineTable({
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  equipment: exerciseEquipmentValidator,
  customEquipment: v.optional(v.string()),
  instructions: v.array(v.string()),
  name: v.string(),
  photoStorageId: v.optional(v.id('_storage')),
  primaryMuscleGroupId: v.id('muscleGroups'),
  secondaryMuscleGroupIds: v.array(v.id('muscleGroups')),
  type: exerciseTypeValidator,
  videoUrl: v.optional(v.string()),
})
  .index('by_name', ['name'])
  .index('by_primary_muscle_group', ['primaryMuscleGroupId'])
  .index('by_type', ['type'])
```

Notes:

- Do not add `ownerCoachId` for MVP because the exercise library is global.
- Keep enum validators shared between schema args and mutations.
- Keep list queries bounded. Use `.take(n)` or pagination, not unbounded `.collect()`.
- Role checks still belong in Convex functions. UI-only checks are not enough.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `entities/exercise`: exercise constants, TS types, display labels, Zod schema helpers if reusable across create/edit.
- `entities/muscle-group`: muscle group option types and display helpers when the form needs them.
- `features/create-exercise`: create form, Formik binding, submit mapping, field-level UI composition.
- `widgets/exercise-library`: page composition, toolbar, list, empty state, create flow placement.
- `src/routes/exercises.tsx`: route-level binding only.

Do not move generic form primitives into `shared/ui` during this first pass unless at least one primitive clearly repeats outside the exercise feature. Feature-local fields are acceptable.

## Backend API Plan

Convex module: `convex/exercises.ts`

Functions:

- `list`: public query, bounded, returns exercises with enough muscle group data for the list.
- `create`: public mutation, validates role from authenticated user, validates referenced muscle groups, writes exercise.

Likely follow-up functions:

- `get`
- `update`
- `remove`
- `generatePhotoUploadUrl`

Authorization:

- Authenticated coach can create global exercises in MVP.
- Trainee cannot create exercises.
- Future admin split should be isolated to a helper such as `requireCoachAdmin(ctx)`.

## Implementation Plan

1. Add shared exercise validators/constants for Convex.
2. Update `convex/schema.ts` to use tighter exercise field validators and timestamps.
3. Add `convex/exercises.ts` with `list` and `create`.
4. Add frontend exercise constants and form schema in `entities/exercise`.
5. Add create form in `features/create-exercise`.
6. Add exercise library widget with toolbar, list, empty state, and create panel.
7. Replace placeholder `/exercises` route with the widget.
8. Add focused tests for schema mapping, form validation, and create behavior where project test setup allows.
9. Run `npm run typecheck`, `npm run build`, and browser sanity check for `/exercises`.

## Acceptance Criteria

- Coach can open `/exercises`.
- Empty library shows a clear empty state and create action.
- Coach can submit a valid exercise without photo, video, or instructions.
- `equipment = other` requires custom equipment text.
- Video URL is optional, but invalid URL is rejected.
- Secondary muscle groups cannot include the primary muscle group.
- Created exercise appears in the list after save.
- Loading and saving states are visible and do not shift layout awkwardly.
- Convex mutation derives identity server-side and enforces coach access.

## Test Checklist

- `npm run typecheck`
- `npm run build`
- Form validation: missing name, missing primary muscle group, invalid video URL, other equipment without custom text.
- Create mutation: valid minimum payload.
- Authorization: trainee or unauthenticated user cannot create.
- Browser: `/exercises` renders list or empty state and create flow.

## Open Follow-Ups

- Exact auth provider setup is still unresolved.
- Photo upload UI can be added after the create flow works without media.
- Edit/delete should be planned as separate follow-up features.
