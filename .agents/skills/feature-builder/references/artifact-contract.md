# Artifact Contract

Use for prompt design, generator protocols, or Chef/Bolt-style implementation planning. Do not use this XML-style contract for normal Codex file edits when native tools are available.

## Pattern

The useful pattern is:

```text
identity prompt + environment constraints + product policy + output protocol + execution engine
```

The XML-like layer is an execution markup, not enterprise XML. It makes generated implementations parseable, streamable, and enforceable.

## Minimal DSL

```xml
<featureArtifact id="short-kebab-id" title="Human title">
  <plan>
    <step>One short implementation step.</step>
  </plan>
  <action type="file" path="src/example.tsx">
    Full file contents here.
  </action>
  <action type="shell">
    npm run typecheck
  </action>
  <action type="verify">
    Explain what must be checked after execution.
  </action>
</featureArtifact>
```

## Action Types

- `file`: create or replace a complete file. Must include full contents.
- `edit`: targeted edit description for an executor that supports patching.
- `shell`: command to run after required files exist.
- `start`: dev server command.
- `verify`: manual or automated verification.
- `decision`: unresolved product or architecture decision that must be confirmed before safe implementation.

## Rules

- Use one artifact for one coherent feature.
- Use stable IDs and explicit paths.
- Include complete file contents for `file`; never use "rest unchanged".
- Put dependency/package changes before files that import those dependencies.
- Separate user-facing explanation from executable actions.
- Keep payloads serializable and deterministic.
- Prefer `decision` over guessing on product rules listed as open decisions.

## When To Prefer JSON

Use JSON schema instead of XML-like tags when responses are fully machine-consumed, not streamed, and strict validation matters more than interleaving prose with actions.

## When To Prefer Native Tools

Use native tool calling when the runtime already has reliable `read_file`, `write_file`, `edit_file`, `run_command`, browser, and PR tools. In that case, keep this reference as planning inspiration, not output format.
