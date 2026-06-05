# RTA Agent Guide

Read this before changing the repo.

## First Moves

1. Read [docs/rta-production-authoring-platform-spec.md](docs/rta-production-authoring-platform-spec.md).
2. Read [docs/rta-ish-source-inventory.md](docs/rta-ish-source-inventory.md).
3. Read [docs/rta-reset-plan-board.md](docs/rta-reset-plan-board.md).
4. Read [docs/meeting-digest-live-milestones.md](docs/meeting-digest-live-milestones.md) when working toward the proving app.
5. Check `git status --short`.
6. Keep changes scoped to the active work-ledger item. Plane cards are optional mirrors, not the source of truth.
7. Do not reintroduce Rita naming in user-facing code or docs.

## Reset Warning

The previous `.mjs` implementation was rejected as the production foundation
and has been removed from tracked source. Treat old `.mjs` references in
historic docs as prototype evidence only.

The current RTA build is the TypeScript workspace in this repo. Continue from
the TypeScript/CQRS spine, strict primitive instrumentation, vocab, generated
obligations, checks, fixtures, and readable log projections here.

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

The production check surface is implemented through the local TypeScript CLI.
Run generation before production checks when declarations change:

```bash
pnpm --filter @rta/cli rta generate --root ../..
pnpm --filter @rta/cli rta check --production --root ../../fixtures/golden/pass
pnpm check
pnpm check:pure-ts
```

For focused work, use the named checks instead of guessing:

```bash
pnpm --filter @rta/cli rta check --ard-meta --root ../..
pnpm --filter @rta/cli rta check --generated-sync --root ../..
pnpm --filter @rta/cli rta check --operation-event --root ../..
pnpm --filter @rta/cli rta check --primitive-boundaries --root ../..
pnpm --filter @rta/cli rta check --pattern-specs --root ../..
pnpm --filter @rta/cli rta check --pattern-contracts --root ../..
pnpm --filter @rta/cli rta check --archetype-specs --root ../..
pnpm --filter @rta/cli rta check --archetype-bindings --root ../..
pnpm --filter @rta/cli rta check --pure-ts --root ../..
```

Run the repo-native work check before claiming a capability is ready:

```bash
pnpm check:work-ledger
pnpm check:demo-coverage
```

The check must not require Plane, GitHub, or any other external work tracker.

## Runtime Demo Loop

Use the TypeScript proving app and generated app smoke path to verify that
generated/runtime paths still line up:

```bash
pnpm --filter @rta/example-meeting-digest test
pnpm --filter @rta/cli test
pnpm check
```

Publication paths must remain review-gated and connector-policy-gated when
they are reintroduced in TypeScript. Dry-run publishers must not write to
AFFiNE, Plane, GitHub, or the home lab.

## Optional Hosting

Home-lab deployment is optional adapter output. Generate and validate draft artifacts locally:

```bash
pnpm check
```

Do not promote into `/Users/virgil/Developer/Virgil-Info/home-lab-v7` unless the user explicitly asks for a live lab step.

## Demo Coverage

Every card/capability needs a demo path. It can be direct, or it can be proven by a later integration/demo card that uses the capability. Do not mark a capability complete merely because code exists.

Use:

- [docs/demos/README.md](docs/demos/README.md)
- [docs/demos/rta-demo-coverage-map.md](docs/demos/rta-demo-coverage-map.md)
