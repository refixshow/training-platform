---
name: feature-sliced-architecture
description: Use when designing, implementing, reviewing, or refactoring a React/TypeScript app toward Feature-Sliced Design or feature-sliced architecture. Triggers on requests about app/shared/entities/features/widgets/pages structure, public APIs, cross-feature sharing, slice boundaries, avoiding over-slicing, grouping related code, import rules, large file decomposition, or deciding whether code should stay local, move to shared, become an entity, or become a feature. This skill requires asking the programmer before making ambiguous architectural decisions about sharing limits, slice boundaries, or strictness.
---

# Feature-Sliced Architecture

Use Feature-Sliced Design as a practical architecture direction, not a rigid religion. Favor clear ownership, stable boundaries, and easy navigation. Do not over-slice small code just to match a diagram.

## Core Rule

If a sharing boundary, slice boundary, or strictness level is ambiguous, ask the programmer before deciding.

Ask especially when:

- Moving code from a page or feature into `shared`.
- Creating a new `entities/*` slice.
- Creating a new `features/*` slice for code used by only one page.
- Allowing cross-slice relationships.
- Grouping several small concepts into one slice.
- Splitting a slice because it is getting large.
- Adding architecture lint rules or hard import restrictions.

Use this question shape:

```text
I see two reasonable FSD placements:
1. Keep it local in [page/feature] because [reason].
2. Extract it to [shared/entities/features/widgets] because [reason].
Which boundary do you want for this project?
```

Do not silently choose a restrictive boundary when the programmer has not confirmed it.

## Pragmatic Mental Model

Start from pages and user flows. Extract downward only when reuse, ownership, or complexity justifies it.

Prefer this progression:

1. Keep code local to the page or route while it is single-use.
2. Move repeated visual primitives to `shared/ui`.
3. Move generic helpers to focused libraries under `shared/lib`.
4. Move domain concepts to `entities/*` when multiple features/pages need the same concept.
5. Move user actions to `features/*` when they represent reusable product capabilities.
6. Compose larger page blocks in `widgets/*`.
7. Keep route setup, providers, and app shells in `app`.

Do not create tiny slices for every small component. A slice name is a global namespace entry and should earn its place.

## Layers

Use these layers when they bring value:

- `app`: routing, providers, app shell, global setup.
- `pages`: route-level pages that bind data, auth, loading, empty, error, and layout.
- `widgets`: large composed sections used by pages.
- `features`: user actions and product capabilities, such as `log-workout`, `build-routine`, `assign-program`, `upload-progress-photo`.
- `entities`: business concepts, such as `user`, `exercise`, `routine`, `program`, `training-result`, `progress-photo`, `activity`.
- `shared`: design-system UI, generic utilities, config, route constants, API clients, and framework-agnostic helpers.

The deprecated `processes` layer should not be introduced unless the programmer explicitly asks for it.

## Segments

Inside a slice, use purpose-based segments only when needed:

- `ui`: components and visual composition.
- `model`: state, schemas, types, selectors, domain logic.
- `api`: data access, Convex calls, server interaction wrappers.
- `lib`: slice-local helpers.
- `config`: slice-local configuration.
- `constants`: stable slice-local constants when they are not better placed in `model` or `config`.

Avoid segment names that only describe file essence, such as generic `components`, `hooks`, `types`, and `utils`, when a purpose-based segment would be clearer. Inside a component folder, smaller technical files like `*.types.ts`, `*.utils.ts`, and `*.constants.ts` are acceptable because they keep files small.

## Import Rules

Default dependency direction:

- Higher layers may import lower layers.
- Lower layers may not import higher layers.
- Slices should not import from sibling slices on the same layer by default.
- Files inside the same slice may import each other through relative paths.
- Consumers outside a slice should import through the slice public API.

Common direction:

```text
app -> pages -> widgets -> features -> entities -> shared
```

`app` and `shared` are exceptions: they do not have business slices in the same way. Internal imports inside `shared` are allowed, but keep `shared` organized by focused purpose so it does not become a dump.

## Public API

Each real slice should expose only the necessary surface through `index.ts`.

Good public API:

- Re-exports stable components, types, and functions intended for other slices.
- Hides internal folder structure.
- Avoids wildcard `export *` when it exposes too much.
- Keeps consumers from depending on internals.

Inside the same slice, use relative imports and full paths. From another slice, use the public API.

For `shared/ui` and `shared/lib`, prefer per-module public APIs:

```text
shared/ui/button/index.ts
shared/ui/text-field/index.ts
shared/lib/date/index.ts
shared/lib/format-number/index.ts
```

Avoid one huge `shared/index.ts` that exports everything.

## Sharing Rules

Sharing is allowed within a reasonable limit. The AI does not decide that limit alone.

Use these heuristics, then ask the programmer when the result is not obvious:

- Single-use code usually stays local.
- Two uses may still stay local if the abstraction would be unclear.
- Three or more unrelated uses are a signal to extract.
- Reuse across different pages is stronger evidence than reuse inside one page.
- Generic UI belongs in `shared/ui`.
- Generic non-UI logic belongs in a focused `shared/lib/<purpose>`.
- Domain-shaped code belongs in `entities/<entity>` only when the entity is used across multiple features/pages.
- User-action code belongs in `features/<action>` only when the action is reusable or complex enough to deserve ownership.
- Cross-entity relationships may be modeled explicitly, but ask before adding special cross-import APIs.

If the programmer says grouping is acceptable, group related small concepts instead of creating many tiny slices.

## Anti-Patterns

Flag and avoid:

- Over-slicing every small component into its own feature.
- Moving code to `shared` because it feels reusable but has only one consumer.
- Creating `shared/utils` as a dumping ground.
- Creating sibling slice imports without an agreed public boundary.
- Exporting every internal file through wildcard public APIs.
- Putting business logic into `shared/ui`.
- Making pages empty composition shells too early.
- Hiding feature-specific logic inside generic primitives.
- Introducing strict lint rules before the programmer confirms the desired strictness.

## Workflow For New Code

1. Identify the user flow or page first.
2. Place first implementation close to the page or feature.
3. Extract only when reuse, ownership, or complexity is real.
4. Use public APIs for cross-slice consumption.
5. Keep files small by splitting types, constants, helpers, variants, and UI where useful.
6. Ask the programmer before deciding ambiguous sharing or slice boundaries.
7. Document non-obvious boundary decisions in a short code comment or local README only when it prevents future confusion.

## Workflow For Refactors

Before moving code:

1. List current consumers.
2. Identify whether the code is generic UI, generic lib, domain entity, user action, widget, page-local, or app setup.
3. Check if moving it reduces coupling or only creates architecture ceremony.
4. Propose 2 options when there is a tradeoff.
5. Ask the programmer to choose if the boundary is subjective.

Only move code after the boundary is clear.

## Project-Specific Defaults

For this coaching app, likely slices include:

- `entities/user`
- `entities/exercise`
- `entities/muscle-group`
- `entities/routine`
- `entities/program`
- `entities/training-result`
- `entities/progress-photo`
- `entities/activity`
- `features/log-workout`
- `features/build-routine`
- `features/build-program`
- `features/assign-program`
- `features/upload-progress-photo`
- `features/review-training-results`
- `features/manage-muscle-groups`
- `widgets/coach-dashboard`
- `widgets/trainee-current-workout`
- `widgets/program-planner`
- `widgets/statistics-overview`

This is a starting map, not a mandate. Ask before creating many slices at once.
