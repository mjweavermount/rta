# RTA

RTA is an app-authoring platform for building observable, reviewable applications from domain vocabulary.

It turns declared vocabulary, tier contracts, use cases, scenarios, ARDs, and runtime wiring into generated scaffolding, checks, test obligations, log ceremonies, review gates, app CLIs, and optional hosting-adapter artifacts.

## Current Status

This repository is in production-bootstrap state. The source of truth for the build and proving app is:

- [RTA Production Authoring Platform Spec](docs/rta-production-authoring-platform-spec.md)
- [RTA To Live Meeting Digest Milestones](docs/meeting-digest-live-milestones.md)
- [RTA Demo Walkthroughs](docs/demos/README.md)

## Intended Authoring Loop

```bash
node scripts/rta.mjs context
node scripts/rta.mjs generate
node scripts/rta.mjs explain graph
node scripts/rta.mjs check --production
npm run check
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

## Current QA Loop

```bash
node scripts/rta.mjs scenario watch meeting-digest.integrated.fixture --input tests/fixtures/custom-transcript.txt
node examples/meeting-digest-seed/bin/meeting-digest.mjs scenario run approved-digest-publishes-work-items --review --high
node scripts/rta.mjs check --review-gates
node scripts/rta.mjs check --connector-safety
node scripts/rta.mjs check --runtime-wiring
node scripts/rta.mjs check --scenario-runtime-parity
node scripts/rta.mjs check --hosting-package
```

## Demo Coverage

Every nontrivial RTA capability should be tied to a direct demo or proof-through-integration path. Start with the [demo coverage map](docs/demos/rta-demo-coverage-map.md).

## Work Ledger

RTA tracks work in repo-local ledger files under `work/`. External tools such as Plane or GitHub may mirror those items, but they are not required to validate the repo.

```bash
node scripts/check-work-ledger.mjs
```
