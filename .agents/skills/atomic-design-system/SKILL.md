---
name: atomic-design-system
description: Use when designing, implementing, reviewing, or refactoring React/TypeScript UI components into an Atomic Design system with strict token and variant APIs. Triggers on requests about Atomic Design, design-system structure, shadcn/Tailwind component wrappers, blocking public className props, typed component variants, render props, compound/composable component APIs, splitting large UI files, or organizing component folders into components, types, utils, constants, styles, and tests. Also use when deciding whether a component belongs in the design system or should remain feature/domain-specific.
---

# Atomic Design System

Build React UI with a strict Atomic Design layer and a pragmatic feature layer. Design-system components are stable primitives with token-driven APIs. Feature components can be more specific and less restricted when they belong to a product workflow.

## First Decide The Component Tier

Before editing or creating a component, classify it:

- **Atom:** button, input, label, badge, avatar, icon button, separator, spinner, typography, field message.
- **Molecule:** search field, stat tile, set input group, filter chip group, media picker, form field.
- **Organism:** exercise editor, routine exercise block, workout set table, program week planner, progress photo slider, coach stat panel.
- **Template:** trainee workout shell, coach management shell, admin layout, analytics layout.
- **Page:** route-level binding of data, auth, loading, empty, and error states.
- **Feature/domain component:** workflow-specific component that should not become a reusable design-system primitive.

Do not force every component into the design system. If it depends on a product data shape, business rule, route context, or one feature's workflow, keep it in a feature/domain slice and compose design-system primitives inside it.

## Public API Rules

For design-system components:

- Do not expose `className`.
- Do not expose arbitrary Tailwind passthroughs.
- Do not expose generic `style` escape hatches.
- Do not accept one-off visual override props that bypass tokens.
- Do not embed feature-specific data assumptions in atoms or molecules.

Use these customization patterns instead:

- Typed variants: `variant`, `size`, `tone`, `density`, `intent`, `state`.
- Token-backed props constrained to known tokens.
- Boolean behavior props for defined behavior.
- `children` for caller-owned content.
- Render props when the caller needs state while the component preserves structure.
- Compound components when the component has intentional parts.

Internal implementation may use Tailwind classes, shadcn primitives, CVA, CSS variables, or utility functions. The restriction applies to the exported design-system API.

## File Structure

Keep files small. Split by responsibility before a file becomes difficult to scan.

Recommended component folder:

```text
button/
  button.tsx
  button.types.ts
  button.variants.ts
  button.constants.ts
  button.utils.ts
  button.test.tsx
  index.ts
```

Use only the files a component actually needs:

- `*.tsx`: render implementation.
- `*.types.ts`: public props, internal types, variant type exports.
- `*.variants.ts`: CVA or equivalent variant configuration.
- `*.constants.ts`: stable option maps, token names, aria labels, limits.
- `*.utils.ts`: local pure helpers used by the component.
- `*.test.tsx`: behavior, a11y, and variant tests where relevant.
- `index.ts`: narrow public exports.

Avoid dumping unrelated helpers, constants, and subcomponents into one large component file. If a subcomponent is reusable only inside the parent, keep it private in the same folder, not in global shared UI.

## Feature-Sliced Placement

Prefer a feature-sliced architecture:

- `shared/ui` for design-system atoms and common molecules.
- `shared/lib` for generic utilities.
- `shared/config` or `shared/constants` for cross-app constants.
- `entities/<entity>` for domain concepts such as exercise, routine, program, user, training-result.
- `features/<feature>` for user actions such as log-workout, build-routine, assign-program, upload-progress-photo.
- `widgets/<widget>` for larger composed page sections.
- `app` for routing, providers, shells, and page composition.

When unsure, place reusable visual primitives lower in `shared/ui`, domain-shaped display components in `entities`, user actions in `features`, and assembled screen sections in `widgets`.

## Implementation Checklist

When creating or refactoring a design-system component:

1. Classify the tier.
2. Define the public API in `*.types.ts`.
3. Encode appearance through variants and tokens.
4. Keep `className` out of the public props.
5. Compose shadcn/ui primitives where useful instead of forking accessibility behavior.
6. Split constants, variants, and utils into their own files when they add noise to the render file.
7. Export only the intended API from `index.ts`.
8. Add tests for variant output, accessibility-critical behavior, and controlled/uncontrolled behavior when relevant.

## Review Checklist

Flag these issues during review:

- Public `className` on design-system components.
- Arbitrary visual props such as `textColor`, `bg`, `padding`, or `rounded` when they are not token-constrained.
- Tailwind strings passed through from feature code into shared UI.
- Large component files mixing types, constants, variant maps, helpers, render logic, and feature logic.
- Atoms importing feature/domain modules.
- Design-system components that know about workouts, exercises, programs, coaches, or trainees.
- Feature components promoted to shared UI too early.
- Repeated styling that should become a variant or token.

## Acceptable Escape Valve

Feature/domain components may be less restrictive. They can accept workflow-specific props, compose layout more freely, and contain product logic. They should still prefer design-system primitives internally and should not leak arbitrary styling into shared UI.

If a feature component starts being reused in three or more unrelated places, reassess whether part of it should be extracted into a molecule or organism with a stricter API.
