# Coaching Platform

TanStack Start baseline for a coach and trainee training platform.

## Stack

- TanStack Start
- React
- TypeScript
- Tailwind CSS
- shadcn/ui configuration
- Convex
- Convex Auth package
- TanStack Query with Convex React Query integration
- Formik
- Zod
- Recharts
- Nitro preset for Vercel output

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Convex

The frontend is wired to use `VITE_CONVEX_URL` when available. To create and sync a Convex dev deployment, run:

```bash
npm run convex:dev
```

That command is interactive on first run and will create the local Convex env values. Use `.env.local.example` as the placeholder reference.

Convex AI guidance is installed at `convex/_generated/ai/guidelines.md`. Read it before changing Convex schema, queries, mutations, actions, auth, or migrations.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` emits Vercel-compatible output through Nitro.

## Project Docs

- `PRODUCT.md`: strategic product context.
- `DESIGN.md`: seed design system direction.
- `FEATURES.md`: functional scope and MVP.
- `TECH.md`: architecture and stack decisions.
- `AGENTS.md`: instructions for future agents.

