# RTA Reset Plan Board

Date: 2026-06-05

Status: canonical repo-side board for the RTA restart

## Board Rule

This board supersedes the previous RTA/Rita Plane cards for the restart effort.

Plane may mirror this board later, but this file is the source of truth until a
supported Plane project/card creation path exists. Do not treat the old LAB-32
through LAB-49 cards as the active RTA plan without reconciling them against
this board.

## Columns

Use these states:

- `Backlog`: captured, not shaped enough to build.
- `Ready`: shaped enough for implementation.
- `In Progress`: actively being changed.
- `Demo Ready`: implemented and tied to an experiential proof.
- `Accepted`: verified or explicitly accepted.
- `Superseded`: replaced by a newer reset card.

## Active Board

| ID | State | Title | Outcome | Demo / Acceptance |
| --- | --- | --- | --- | --- |
| RTA-RESET-00 | Demo Ready | Supersession and source inventory | RTA has a single canonical restart plan and all old attempts are classified as literal source, inspiration, archive, or discard. | Open `docs/rta-ish-source-inventory.md`; confirmed by repo-side reset docs. |
| RTA-RESET-01 | Demo Ready | Bootstrap canonical TypeScript monorepo | A clean `pnpm` workspace exists with `packages/vocab`, `packages/core`, `packages/strict`, `packages/scenario`, `packages/cli`, fixtures, and docs. | `pnpm check` builds, typechecks, tests, runs golden fixtures, and runs sample-app loop. |
| RTA-RESET-02 | Demo Ready | Port strict CQRS core | Commands, queries, events, scoped handlers, and command/query/event buses are TypeScript contracts with command/query separation enforced by types and tests. | `@rta/core` tests prove message factories, scoped CQRS buses, missing-handler failures, and golden fixture checks pass. |
| RTA-RESET-03 | Demo Ready | Add governed execution kernel | `OperationScope`, trust promotion, capability tokens, reasons, Unit of Work, deterministic clock/random, and boundary guards exist in the core runtime. | `packages/core/test/operation-scope.test.ts` proves deterministic scope creation, trust promotion, capabilities, and required reasons. |
| RTA-RESET-04 | Demo Ready | Implement abstract primitive instrumentation | Base primitive classes own the public execution method and descendants implement protected hooks without bypassing required operation events. | `packages/strict/test/primitive.test.ts` proves required command-handler, event-handler, and generic primitive operation phases for success and failure. |
| RTA-RESET-05 | Demo Ready | Rebuild vocab, tiers, patterns, and archetypes | Vocab can declare primitives, app-local concrete extensions, reusable patterns, and archetypes with transitive inherited obligations, concrete fields, and operation event requirements. | `tests/tiers.test.mjs` proves tier blooming, circular bloom rejection, and inherited operation events; production checks require app logging to satisfy bloomed operations. |
| RTA-RESET-06 | Demo Ready | Rebuild ARD and obligation loop | ARDs are typed policy objects; obligations are deterministic; generated tests/checks drift when vocab changes. | Golden fail fixtures cover invalid ARD metadata, missing obligation coverage, and generated obligation tests. |
| RTA-RESET-07 | Demo Ready | Build operation event projections | Structured operation events are canonical; readable logs, scenario capture, OTEL descriptors, and visualizer feed are projections. Normal logs use compact operator prose like `[normal] RULE-NO_DUP_IDS Rejected Obj.id`; trace logs add stack-like diagnostic fields. | Strict lifecycle/projection tests pass; `rta check --operation-event` has pass/fail golden coverage; scenario capture writes readable logs, operation-events JSON, and trace summaries; meeting digest scenario emits command-handler and outbound-adapter readable logs. |
| RTA-RESET-08 | Demo Ready | Build app authoring CLI | CLI supports init/context/generate/check/explain/scenario/run/review with explicit warnings for unsupported modes. Strict generation emits instrumented command/query handler subclasses, not loose behavior functions, and emits a typed registry dispatch surface for runnable CQRS apps. `rta generate app` emits a local-authoring app CLI backed by `@rta/runtime` with run/scenario/status/watch/review/logs/graph/doctor paths. | Golden fixture and sample-app loop prove strict CLI init/context/generate/lint/coverage/test-policy/check modes, production checks, primitive-boundary checks, generated registry dispatch, generated app typecheck, generated app install, generated app watch-mode primitive logs, generated app status, log tail, provenance graph, and review approval. |
| RTA-RESET-09 | Demo Ready | Build internal work ledger and demo coverage | Work/features/capabilities are tracked internally and can export to Plane/GitHub without depending on them. Every ledger item must carry QA steps with at least one `do` action and one `see` observation. | `pnpm check:work-ledger` and `pnpm check:demo-coverage` fail if ledger items lack ownership, demo evidence, `do`/`see` QA steps, produced outputs, or demo-map coverage. |
| RTA-RESET-10 | Demo Ready | Rebuild meeting digest as proving fixture | Meeting digest is rebuilt from generated TypeScript contracts, not from the rejected `.mjs` prototype. | `@rta/example-meeting-digest` extracts topics/work items, runs through an instrumented command handler, emits readable logs, and stays dry-run/review-gated. |
| RTA-RESET-11 | Ready | Add optional home-lab adapter | RTA apps can optionally generate home-lab packaging without making lab deployment mandatory. | Generate a draft WorkloadApp/package artifact and validate it without writing into `home-lab-v7/deploy/apps`. |
| RTA-RESET-12 | Demo Ready | Create end-to-end acceptance harness | One demo proves the authored app path from vocab through generated code, scenario run, logs, review, dry-run publication, and provenance graph. | `pnpm check` runs golden fixtures, sample-app loop, production check, primitive-boundary check, operation-event check, and meeting digest trace/log tests. |
| RTA-RESET-13 | In Progress | Purge active JS/MJS and move to Effect-first TypeScript | RTA source converges on tracked TypeScript only. Effect services/layers own runtime IO, repositories, edge boundaries, secrets, review, queue, logs, and generated app execution. | `pnpm check:pure-ts` blocks new tracked JS/MJS/CJS source and reports the explicit burn-down allowlist until it reaches zero. |
| RTA-RESET-14 | Ready | Add repository, edge-boundary, and secret primitives | DDD repositories, file-backed/in-memory storage, edge trust promotion, SQL safety, and secrets bloom through vocab into checks/logs/runtime layers. | Minimum demo app proves in-memory repository for tests and file-backed repository for local demo with edge validation and secret redaction. |

## Superseded Plane Cards

The old LAB cards are not deleted by this repo-side board. They should be
handled later by one of these paths:

- create a fresh Plane project named `RTA Reset` and mirror the cards above
- or comment/move old LAB-32 through LAB-49 as superseded
- or leave Plane alone and keep RTA planning in this repo until the framework
  can export work items itself

Do not manually reconcile those cards by memory. Reconcile from this board and
the source inventory.

## First Implementation Slice

Start with:

1. RTA-RESET-00: finish source inventory and supersession docs.
2. RTA-RESET-01: create the clean TypeScript monorepo skeleton.
3. RTA-RESET-02: port strict CQRS contracts from `rta-ddd-core`.
4. RTA-RESET-03: port governed execution contracts from `rita-app-framework`.
5. RTA-RESET-04: prove abstract primitive instrumentation.

Meeting digest waits until the framework can prove those contracts.

## Latest Validation

2026-06-05:

```bash
PATH="/Users/virgil/Developer/Virgil-Info/heckitonkires/.hermes/node/bin:$PATH" pnpm check
```

Passed:

- workspace build
- recursive TypeScript typecheck
- vocab/core/strict/runtime/cli/scenario package tests
- meeting digest example tests
- work ledger and demo coverage check
- golden fixture pass/fail loop
- sample-app loop including generated app install, generate, build, watch, status, logs, graph, and review
- pure TypeScript migration rail via `pnpm check:pure-ts`
