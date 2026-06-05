# RTA

RTA is an app-authoring platform for building observable, reviewable applications from domain vocabulary.

It turns declared vocabulary, tier contracts, use cases, scenarios, ARDs, and runtime wiring into generated scaffolding, checks, test obligations, log ceremonies, review gates, app CLIs, and optional hosting-adapter artifacts.

## Current Status

This repository is in bootstrap state. The source of truth for the initial build is:

- [RTA Production Authoring Platform Spec](docs/rta-production-authoring-platform-spec.md)
- [RTA To Live Meeting Digest Milestones](docs/meeting-digest-live-milestones.md)
- [RTA Demo Walkthroughs](docs/demos/README.md)

## Intended Authoring Loop

```bash
pnpm rta init
pnpm rta context
pnpm rta generate
pnpm rta explain obligations
pnpm rta check
```

Authored apps should also receive an operational app CLI generated from their vocab, use cases, scenarios, and runtime wiring.

## Build Order

1. Vocab, ARDs, and CLI skeleton.
2. Derivation graph.
3. Generators and checks.
4. Runtime.
5. Generated app CLI and runtime wiring.
6. Meeting digest proving app.
7. Optional hosting adapters.

## Demo Coverage

Every nontrivial RTA capability should be tied to a direct demo or proof-through-integration path. Start with the [demo coverage map](docs/demos/rta-demo-coverage-map.md).

## Work Ledger

RTA tracks work in repo-local ledger files under `work/`. External tools such as Plane or GitHub may mirror those items, but they are not required to validate the repo.

```bash
node scripts/check-work-ledger.mjs
```
