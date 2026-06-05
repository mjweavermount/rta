# RTA Agent Guide

Read this before changing the repo.

## First Moves

1. Read [docs/rta-production-authoring-platform-spec.md](docs/rta-production-authoring-platform-spec.md).
2. Check `git status --short`.
3. Keep changes scoped to the active work-ledger item. Plane cards are optional mirrors, not the source of truth.
4. Do not reintroduce Rita naming in user-facing code or docs.

## Project Shape

RTA is one project with clear internal modules:

```text
description/checking:
  vocab, tiers, derivation, ards, generators, checks, use-cases

execution:
  runtime, logging, scheduler, review, connectors, app-cli, app-wiring

deployment:
  hosting-adapters
```

## Authoring Rules

- Vocab says what exists.
- Use cases say what a user or system is trying to accomplish.
- Scenarios make use cases executable.
- T1 primitives are rare and foundational.
- T2 patterns are the normal extension point.
- T3 archetypes are reusable functional organs.
- App-local extensions are allowed, but must be upstream-shaped.
- Home-lab hosting is optional and adapter-based.

## Generated Files

Generated files must eventually be marked as one of:

```text
always-regenerated
generated-once
manual-leaf
```

Do not hand-edit always-regenerated files.

## Required Checks

The target production check surface is defined in the spec. During bootstrap, add checks incrementally and keep placeholders honest.

Run the repo-native work check before claiming a capability is ready:

```bash
node scripts/check-work-ledger.mjs
```

The check must not require Plane, GitHub, or any other external work tracker.

## Demo Coverage

Every card/capability needs a demo path. It can be direct, or it can be proven by a later integration/demo card that uses the capability. Do not mark a capability complete merely because code exists.

Use:

- [docs/demos/README.md](docs/demos/README.md)
- [docs/demos/rta-demo-coverage-map.md](docs/demos/rta-demo-coverage-map.md)
