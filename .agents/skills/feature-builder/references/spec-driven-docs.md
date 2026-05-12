# Spec-Driven Feature Docs

Use when a feature needs durable context for humans and AI agents. Keep documentation adjacent to the owning slice, small enough to read, and traceable to implementation.

## Why

Spec-driven AI development works when specs are treated as executable context: requirements shape design, design shapes tasks, and tasks verify implementation. The useful artifact set is small:

- Requirements or feature spec: what behavior must exist.
- Design notes: how this repo will implement it.
- Tasks: incremental implementation and verification checkpoints.
- ADRs: durable decisions with rejected alternatives.

Do not create docs for every button or one-line fix. Create docs when future agents need context that code alone will not reveal.

## Location

Prefer feature-adjacent docs:

```text
src/features/<feature-name>/
├── _docs/
│   ├── spec.md
│   ├── design.md
│   ├── tasks.md
│   └── adr/
│       └── 0001-short-decision.md
├── ui/
├── model/
├── api/
└── index.ts
```

If a feature is planned before code exists, use:

```text
docs/features/<feature-name>/
```

Move or copy the essential docs beside the final owning slice once implementation starts. Do not expose `_docs` from a slice public API.

## Minimal Pack

Use this default:

- `spec.md`: create for any non-trivial feature.
- `design.md`: create when architecture, data flow, state lifecycle, or UI structure is non-obvious.
- `tasks.md`: create when implementation spans multiple files, roles, or phases.
- `adr/*.md`: create only when a decision is hard to infer, reversible only with cost, or affects future feature work.

For tiny changes, do not add docs. Update an existing feature spec only if the behavior changed.

## spec.md Template

```md
# <Feature Name> Spec

## Purpose

One short paragraph describing the user value and scope.

## Users

- Trainee:
- Coach:
- Admin:

## User Stories

### US1: <short title>

Priority: P1

As a <user>, I want <capability>, so that <outcome>.

Independent test: <how to prove this story works alone>.

Acceptance:

- GIVEN <state>, WHEN <action>, THEN <result>.
- GIVEN <state>, WHEN <action>, THEN <result>.

## Requirements

- FR-001: The system must <specific behavior>.
- FR-002: The system must <specific behavior>.

## Edge Cases

- <boundary, error, permission, empty, or concurrent state>.

## Out Of Scope

- <explicit non-goals>.

## Open Questions

- [ ] <question that needs programmer/product decision>
```

## design.md Template

```md
# <Feature Name> Design

## Summary

Short technical approach.

## Ownership

- Route/page:
- Feature slice:
- Entities:
- Convex:
- Shared UI:

## Data Model

Tables, fields, validation, derived data, and indexes.

## Flow

1. <main user/system step>
2. <main user/system step>

## Authorization

- Trainee:
- Coach:
- Admin:

## UI States

- Loading:
- Empty:
- Error:
- Disabled:
- Success:

## Verification

- Typecheck:
- Tests:
- Manual browser checks:
- Convex checks:
```

## tasks.md Template

```md
# <Feature Name> Tasks

## Foundation

- [ ] T001 <blocking setup or schema task>

## US1: <title>

- [ ] T010 <implementation task with exact file path>
- [ ] T011 <verification task>

## Polish

- [ ] T900 <accessibility, responsive, or edge-state task>
```

Task rules:

- Use exact file paths.
- Mark parallel-safe tasks with `[P]` only when they touch different files and have no dependency.
- Group by independently testable user story.
- Keep tasks outcome-based, not vague.

## ADR Template

```md
# ADR 0001: <Decision>

Date: YYYY-MM-DD

## Status

Accepted

## Context

What forced the decision.

## Decision

What we chose.

## Alternatives Considered

- <alternative>: rejected because <reason>.

## Consequences

- Positive:
- Negative:
- Follow-up:
```

## When To Ask First

Ask the programmer before writing specs that resolve:

- Admin as role or coach permission.
- Assigned programs as snapshots or live references.
- Trainee edits to submitted training results.
- Coach visibility of progress photos.
- Bodyweight storage.
- Exercise video links versus uploads.
- Ambiguous FSD boundaries or moves into `shared`.

## Maintenance

- Update docs in the same PR/turn as behavior changes.
- Remove stale tasks after completion only if they no longer help traceability; otherwise mark them complete with implementation notes.
- Prefer one short ADR over paragraphs of hidden rationale inside code comments.
- If docs and code disagree, treat it as implementation drift and reconcile before adding more code.
