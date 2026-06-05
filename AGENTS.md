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

The current `.mjs` implementation is rejected as the production foundation.
Treat it as prototype evidence. Do not continue broadening it as the real
framework.

The next RTA build should start from the TypeScript/CQRS spine in
`/Users/virgil/Developer/Virgil-Info/home-lab-v7/vendor/rta-ddd-core` and prove
the primitive instrumentation, vocab, generated obligations, checks, fixtures,
and readable log projections before rebuilding meeting digest.

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

These commands describe the target production surface. In the current reset,
verify whether they exist before relying on them; stale `.mjs` commands from
the rejected prototype are not proof of production readiness.

The target production check surface is implemented through the local CLI. Run generation before production checks when the app declaration changes:

```bash
node scripts/rta.mjs generate
node scripts/rta.mjs check --production
pnpm check
pnpm check:pure-ts
```

For focused work, use the named checks instead of guessing:

```bash
node scripts/rta.mjs check --tier-contracts
node scripts/rta.mjs check --ard-meta
node scripts/rta.mjs check --generated-sync
node scripts/rta.mjs check --use-cases
node scripts/rta.mjs check --scenario-coverage
node scripts/rta.mjs check --boundary-coverage
node scripts/rta.mjs check --operation-event
node scripts/rta.mjs check --telemetry-coverage
node scripts/rta.mjs check --review-gates
node scripts/rta.mjs check --connector-safety
node scripts/rta.mjs check --runtime-wiring
node scripts/rta.mjs check --scenario-runtime-parity
node scripts/rta.mjs check --hosting-package
node scripts/rta.mjs check --security
```

Run the repo-native work check before claiming a capability is ready:

```bash
node scripts/check-work-ledger.mjs
```

The check must not require Plane, GitHub, or any other external work tracker.

## Runtime Demo Loop

Use the proving app to verify that generated/runtime paths still line up:

```bash
node scripts/rta.mjs scenario watch meeting-digest.integrated.fixture --input tests/fixtures/custom-transcript.txt
node scripts/rta.mjs scenario replay <run-id>
node scripts/rta.mjs queue enqueue meeting-digest.integrated.fixture --input tests/fixtures/custom-transcript.txt --review
node scripts/rta.mjs scheduler start --once
node examples/meeting-digest-seed/bin/meeting-digest.mjs scenario run approved-digest-publishes-work-items --review --high
```

Publication must remain review-gated and connector-policy-gated:

```bash
node scripts/rta.mjs review approve <review-id> --actor Virgil
node scripts/rta.mjs publish dry-run <review-id> --target fixture
```

The dry-run publisher must not write to AFFiNE, Plane, GitHub, or the home lab.

## Optional Hosting

Home-lab deployment is optional adapter output. Generate and validate draft artifacts locally:

```bash
node scripts/rta.mjs hosting intent meeting-digest
node scripts/rta.mjs hosting package meeting-digest
node scripts/rta.mjs hosting validate meeting-digest
```

Do not promote into `/Users/virgil/Developer/Virgil-Info/home-lab-v7` unless the user explicitly asks for a live lab step.

## Demo Coverage

Every card/capability needs a demo path. It can be direct, or it can be proven by a later integration/demo card that uses the capability. Do not mark a capability complete merely because code exists.

Use:

- [docs/demos/README.md](docs/demos/README.md)
- [docs/demos/rta-demo-coverage-map.md](docs/demos/rta-demo-coverage-map.md)
