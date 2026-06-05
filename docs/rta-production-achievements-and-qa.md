# RTA Production Achievements And QA

This is the single-page handoff for what was completed in the RTA production pass and how to QA it.

## Status

All `rta-prod-00` through `rta-prod-15` repo work cards are `demo-covered`.

The current local release gates pass:

```bash
npm run check
npm run check:production
npm run check:release
npm run doctor
npm run audit
```

Expected current result:

- Work ledger passes.
- Test suite passes.
- Production gate passes.
- Release hygiene passes.
- `npm audit --audit-level=moderate` reports zero vulnerabilities.

## What Was Built

RTA now has an enforceable app-authoring loop:

- Tier/vocab contracts for T1 primitives, T2 patterns, T3 archetypes, and app-local concrete extensions.
- ARD spirit/letter checks with reciprocal family validation.
- A central derivation engine for obligations, telemetry, log ceremonies, review gates, use cases, boundary coverage, provenance, and runtime contracts.
- Generated artifacts with derivation hashes and generated-sync drift checks.
- Production checks that combine app declaration, ARDs, tier contracts, generated sync, log ceremony, use cases, boundaries, review gates, connector safety, runtime wiring, telemetry, hosting, and security.
- Runtime unit-of-work state, replay, scheduler one-shot execution, simulated time, artifacts, logs, and provenance.
- Human-readable log ceremony output suitable for watching runs in a terminal.
- Telemetry coverage and Grafana dashboard artifact generation derived from scenario obligations.
- Review gates and connector policies that block dry-run publication until review is approved.
- Generated app runtime wiring with an AppRuntime schema and generated CLI parity checks.
- Meeting digest proving app scenarios for bulk, simulated streaming, loopback topics, unavailable enrichment, and reviewable work-item extraction.
- Optional host-neutral/home-lab hosting adapter output with Containerfile, health server, probes, WorkloadApp draft, and local validation.
- Root and app-level agent guides.
- Package/release hygiene: package exports, lockfile-backed audit, CI checks, doctor, production check, and release hygiene script.

## Fast QA

Run the whole local acceptance loop:

```bash
npm run check
npm run check:production
npm run check:release
npm run doctor
npm run audit
```

Run the main meeting digest experience:

```bash
node scripts/rta.mjs scenario watch meeting-digest.integrated.fixture --input tests/fixtures/custom-transcript.txt
node examples/meeting-digest-seed/bin/meeting-digest.mjs scenario run approved-digest-publishes-work-items --review --high
```

The second command prints:

- `review=...`
- `run=...`
- `artifact=...`
- `digest=...`

Approve and dry-run publish:

```bash
node scripts/rta.mjs review approve <review-id> --actor Virgil
node scripts/rta.mjs publish dry-run <review-id> --target fixture
```

Replay a run:

```bash
node scripts/rta.mjs scenario replay <run-id>
```

## Card QA Steps

Each `work/features/rta-prod-*.feature.yaml` card now has `qaSteps`.

Use these repo cards as the source of truth for per-feature QA:

```bash
node scripts/rta.mjs work show rta-prod-08-runtime-unit-of-work
node scripts/rta.mjs work show rta-prod-12-meeting-digest-seed
node scripts/rta.mjs work show rta-prod-15-package-release
```

## Optional Hosting QA

Hosting is native but optional. It should not require the home lab.

```bash
node scripts/rta.mjs hosting intent meeting-digest
node scripts/rta.mjs hosting package meeting-digest
node scripts/rta.mjs hosting validate meeting-digest
node scripts/rta.mjs check --hosting-package
```

This produces draft artifacts under `.rta/hosting/`.

Live home-lab promotion is intentionally separate and requires explicit operator approval.

## Important Non-Claims

- This does not publish RTA to npm.
- This does not deploy meeting digest into the live home lab.
- This does not write to AFFiNE, Plane, GitHub, Otter, or Kubernetes.
- Plane can mirror the repo work, but the repo work ledger is the current source of truth.

## Useful Docs

- `AGENTS.md`
- `examples/meeting-digest-seed/AGENTS.md`
- `docs/demos/meeting-digest-local-demo.md`
- `docs/demos/rta-demo-coverage-map.md`
- `docs/spec-to-ticket-backlog.md`
