# RTA Production Achievements And QA

This is the single-page handoff for what was completed in the RTA production pass and how to QA it.

## Status

All `rta-prod-00` through `rta-prod-15` repo work cards are `demo-covered`.

The current local release gates pass:

```bash
pnpm check
pnpm run check:production
pnpm check:release
pnpm audit --audit-level high
pnpm check:pure-ts
```

Expected current result:

- Work ledger passes.
- Test suite passes.
- Production gate passes against `fixtures/golden/pass`.
- Release hygiene passes.
- `pnpm audit --audit-level high` reports zero vulnerabilities.

## What Was Built

RTA now has an enforceable app-authoring loop:

- Tier/vocab contracts for T1 primitives, T2 reusable specializations, T3 concrete reusable specializations, and app-local concrete extensions.
- ARD spirit/letter checks with reciprocal family validation.
- A central derivation engine for obligations, telemetry, operation event contracts, review gates, use cases, boundary coverage, provenance, and runtime contracts.
- Generated artifacts with derivation hashes and generated-sync drift checks.
- Production checks that combine app declaration, ARDs, tier contracts, generated sync, operation event contract, use cases, boundaries, review gates, connector safety, runtime wiring, telemetry, hosting, and security.
- Runtime unit-of-work state, replay, scheduler one-shot execution, simulated time, artifacts, logs, and provenance.
- Shared `@rta/runtime` primitives for file-backed runs, queue state, review items, and generated-app execution.
- Human-readable log projection output suitable for watching runs in a terminal.
- Telemetry coverage and Grafana dashboard artifact generation derived from scenario obligations.
- Review gates and connector policies that block dry-run publication until review is approved.
- Generated app runtime wiring with an AppRuntime schema and generated CLI parity checks.
- `rta generate app` now emits an operational app CLI with `run`, `scenario`, `status`, `watch --trace`, `review`, `logs tail`, `graph run`, and `doctor` paths.
- Tier blooming is transitive: app-local vocabulary that extends a T2 or T3 specialization inherits parent primitive obligations and operation event requirements.
- TypeScript CQRS buses in `@rta/core` for scoped command, query, and event dispatch.
- Strict primitive subclasses for command handlers, query handlers, event handlers, and generic runtime primitives.
- Generated strict command, query, and reaction event-handler leaves that inherit operation logging from RTA primitives.
- Generated strict registries with `dispatch`, `dispatchCommand`, `dispatchQuery`, and `dispatchEvent`, proven by the sample-app loop typecheck and generated-app watch demo.
- Work ledger enforcement with mandatory `qaSteps` containing at least one `do` action and one `see` observation for every feature/capability entry.
- Meeting digest proving app scenarios for bulk, simulated streaming, loopback topics, unavailable enrichment, and reviewable work-item extraction.
- Optional host-neutral/home-lab hosting adapter output with Containerfile, health server, probes, WorkloadApp draft, and local validation.
- Root and app-level agent guides.
- Package/release hygiene: package exports, lockfile-backed audit, CI checks, doctor, production check, and release hygiene script.
- Pure TypeScript source gate: `pnpm check:pure-ts` blocks tracked JS/MJS/CJS source. The allowlist is empty.

## Fast QA

Run the whole local acceptance loop:

```bash
pnpm check
pnpm run check:production
pnpm check:release
pnpm audit --audit-level high
pnpm check:pure-ts
```

`pnpm check` includes the generated app authoring smoke:

```text
rta generate app
pnpm install
pnpm generate
pnpm app:build
node dist/app-cli.js watch --trace
node dist/app-cli.js logs tail --run <run-id>
node dist/app-cli.js graph run --run <run-id>
node dist/app-cli.js review create --run <run-id>
```

That path must print readable primitive operation logs, persist run artifacts, expose a provenance graph, and create review items from the same runtime state.

Run the main TypeScript meeting digest proof:

```bash
pnpm --filter @rta/example-meeting-digest test
```

The former `.mjs` meeting-digest seed CLI has been removed. Reintroduce
scenario/watch/review/publish paths in TypeScript only.

## Card QA Steps

Each `work/features/rta-prod-*.feature.yaml` card now has `qaSteps`.

Use these repo cards as the source of truth for per-feature QA:

```bash
pnpm check:work-ledger
pnpm check:demo-coverage
```

## Optional Hosting QA

Hosting is native but optional. It should not require the home lab.

```bash
pnpm check
```

Live home-lab promotion is intentionally separate and requires explicit operator approval. Optional hosting adapters should be reintroduced in TypeScript only.

## Important Non-Claims

- This does not publish RTA to npm.
- Generated apps currently use local `file:` dependencies to the checked-out RTA packages. Publishing replaces those links with versioned package dependencies.
- This does not deploy meeting digest into the live home lab.
- This does not write to AFFiNE, Plane, GitHub, Otter, or Kubernetes.
- Plane can mirror the repo work, but the repo work ledger is the current source of truth.

## Useful Docs

- `AGENTS.md`
- `examples/meeting-digest/src/index.ts`
- `docs/demos/meeting-digest-local-demo.md`
- `docs/demos/rta-demo-coverage-map.md`
- `docs/spec-to-ticket-backlog.md`
