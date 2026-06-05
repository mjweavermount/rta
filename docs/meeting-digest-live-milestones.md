# RTA To Live Meeting Digest Milestones

This plan turns the current RTA bootstrap into a live meeting digest app.

The meeting digest is the proving app. It is not RTA core. RTA core must stay
usable for other streaming and bulk job apps.

Plane cards may mirror this work, but the RTA repo ledger remains the source of
truth. Every milestone below has a demo because work that cannot be experienced
is not ready.

## M0 - Bootstrap And Ledger Enforcement

Status: mostly done.

Mirrors:

- LAB-34 Bootstrap the RTA monorepo from the production spec
- LAB-49 Define RTA work ledger and demo coverage tracking

Outcome:

RTA has a repo home, production spec, agent guide, work ledger, demo coverage
map, and executable ledger check.

Feasible subtasks:

- Keep `README.md`, `AGENTS.md`, and the production spec aligned.
- Keep every nontrivial capability represented in `work/capabilities`.
- Keep `node scripts/check-work-ledger.mjs` passing.
- Add ledger entries before implementation work, not after it.

Demo:

- Run `node scripts/check-work-ledger.mjs`.
- Open `docs/demos/rta-demo-coverage-map.md`.
- Confirm every current work item has a demo or proof-through-integration path.

Exit criteria:

- Ledger check passes.
- New work cannot be accepted without ledger and demo coverage.

## M1 - First Authoring CLI

Mirrors:

- LAB-35 Port RTA vocab, ARD, and CLI skeleton
- LAB-45 Build RTA CI, package, and release hygiene
- LAB-46 Write the RTA agent playbook and docs set

Outcome:

RTA has a small real CLI that can initialize a fixture app, print context, list
work-ledger items, and run the first checks.

Feasible subtasks:

- Add package manifests for `packages/cli`, `packages/work-ledger`, and
  `packages/checks`.
- Implement `rta work list`, `rta work show <id>`, and `rta check --work-ledger`.
- Implement `rta init` against a tiny fixture app.
- Add tests for command parsing, ledger reads, and failure output.
- Add CI that runs the available checks without requiring Plane or home-lab
  credentials.
- Document the first agent loop in `AGENTS.md`.

Demo:

- Run `rta work list` and see the current capability ledger.
- Run `rta init examples/hello-rta`.
- Run `rta check --work-ledger` and see the same result as the bootstrap script.

Exit criteria:

- A fresh agent can run the CLI locally and understand the next work item.

## M2 - Vocabulary, ARDs, And Derivation

Mirrors:

- LAB-35 Port RTA vocab, ARD, and CLI skeleton
- LAB-36 Build the RTA derivation graph engine
- LAB-37 Enforce app-local extension and upstreaming contracts

Outcome:

RTA can declare vocabulary, validate ARD metadata, permit app-local extensions,
and explain why generated obligations exist.

Feasible subtasks:

- Define minimal schemas for primitive, pattern, archetype, concrete extension,
  ARD, and generated-file classification.
- Implement `rta context` to show vocabulary, ARDs, local extensions, and
  upstream candidates for a fixture app.
- Implement `rta check --ard-meta`.
- Implement `rta check --extensions-local`.
- Implement `rta check --extensions-upstreamable`.
- Implement `rta explain <thing>` for at least one generated obligation.
- Add golden fixtures for one primitive, one pattern, one archetype, and one
  app-local concrete extension.

Demo:

- Create a fixture app with one concrete meeting-domain extension.
- Run `rta context`.
- Run `rta explain obligation <id>` and see the derivation chain from vocab to
  check/test/log obligation.

Exit criteria:

- The system can say why an obligation exists and whether it came from core RTA
  vocab or an app-local extension.

## M3 - Use Cases, Scenarios, And Boundary Coverage

Mirrors:

- LAB-38 Add use-case, scenario, and boundary coverage layer

Outcome:

RTA treats user stories, use cases, scenarios, bounded-context interactions, and
integration contracts as first-class artifacts.

Feasible subtasks:

- Define use-case and scenario file formats.
- Define bounded-context interaction declarations.
- Implement `rta scenario list`.
- Implement `rta scenario run <id>` for a deterministic fixture.
- Implement `rta check --use-cases`.
- Implement `rta check --scenario-coverage`.
- Implement `rta check --boundary-coverage`.
- Add at least one passing and one intentionally failing scenario fixture.

Demo:

- Run a scenario that moves a fake transcript through topic extraction to a
  review-ready artifact.
- Show a boundary coverage report naming which context interactions were
  exercised.

Exit criteria:

- A feature can be rejected because it lacks an executable scenario or boundary
  coverage.

## M4 - Runtime Ports And Generated App CLI

Mirrors:

- LAB-39 Generate app CLIs and runtime wiring contracts
- LAB-43 Define RTA storage, queue, artifact, and run-state ports

Outcome:

RTA-authored apps run through generated operational CLIs backed by explicit
runtime ports for storage, queue, artifacts, clock, and run state.

Feasible subtasks:

- Define runtime port interfaces.
- Implement in-memory adapters for tests and local demos.
- Implement filesystem or SQLite-backed local adapters.
- Generate a tiny app CLI from fixture app declarations.
- Ensure scenario execution and generated app CLI use the same runtime wiring.
- Add time simulation hooks for deterministic tests.
- Implement `rta check --runtime-wiring`.
- Implement `rta check --app-cli`.

Demo:

- Run the generated fixture app CLI.
- Inspect stored run state and artifact output.
- Replay the run with simulated time and get stable output.

Exit criteria:

- The app path and scenario path cannot silently diverge.

## M5 - Observability And Human-Readable Logs

Mirrors:

- LAB-42 Define RTA observability, log QA, and Grafana contract

Outcome:

RTA runs are watchable. Every significant runtime step emits structured logs and
human-readable operation logs with enough detail to debug by reading the trace.

Feasible subtasks:

- Define log event schema and human-readable template contract.
- Require log calls to name actor, run id, step, input summary, output summary,
  timing, and causal parent where available.
- Implement verbosity levels up to near-stack-trace detail.
- Implement `rta check --operation-event`.
- Add tests that fail when required log events are missing.
- Define Grafana dashboard contract without requiring a live Grafana instance.

Demo:

- Run a scenario at normal verbosity and high verbosity.
- Show the human-readable trace for the same run.
- Show structured log output can be correlated by run id.

Exit criteria:

- Virgil can watch a run and understand what happened without opening source.

## M6 - Internal Review Gate And Provenance

Mirrors:

- LAB-44 Define RTA review identity and approval actor model
- LAB-48 Design the RTA monitor/review/provenance UI scope

Outcome:

RTA owns internal review state, approval identity, and provenance before any
external system receives published work.

Feasible subtasks:

- Define review item, approval actor, approval decision, and rejection reason.
- Define provenance graph nodes and edges for inputs, transformations, artifacts,
  review actions, and publications.
- Implement local review queue commands.
- Implement `rta review approve`, `rta review reject`, and `rta review show`.
- Ensure publication adapters cannot run before review gates pass.
- Produce a UI scope/prototype spec for monitor, review, and provenance views.

Demo:

- Run a scenario that creates a review item.
- Approve it with a named actor.
- Show the provenance graph includes input, run steps, artifact, and approval.

Exit criteria:

- External publication is impossible without a recorded review decision.

## M7 - End-To-End RTA Demo Harness

Mirrors:

- LAB-47 Create an RTA end-to-end demo and acceptance harness

Outcome:

RTA has one small full-loop demo app that proves authoring, checking, runtime,
logs, review, provenance, and generated app CLI work together.

Feasible subtasks:

- Build the smallest non-meeting fixture app.
- Wire generated app CLI, runtime ports, logs, review, and provenance.
- Add one command that runs the complete demo.
- Capture demo output artifacts for review.
- Make the demo run in CI without home-lab services.

Demo:

- Run `rta demo run`.
- Watch logs.
- Inspect artifact output.
- Approve a review item.
- Re-run the same demo and confirm deterministic behavior.

Exit criteria:

- Internal platform cards can be accepted by proof-through-integration through
  this demo.

## M8 - Meeting Digest Proving App

Mirrors:

- LAB-40 Build meeting digest as the first RTA proving app

Outcome:

Meeting digest works locally as an RTA-authored app. It can process a transcript
or stream-like topic batch, produce topic summaries, extract feature,
automation, and research tasks, and route the result to review.

Feasible subtasks:

- Define meeting digest bounded contexts: ingestion, topic segmentation,
  enrichment, task extraction, review, publication.
- Define bulk input and streaming input modes through the same runtime model.
- Implement transcript fixture ingestion.
- Implement topic shift detection and append-on-loopback behavior.
- Implement enrichment ports for AFFiNE or local docs, initially as safe local
  fixtures.
- Implement task extraction schema focused on goal, user, systems, integration,
  larger system, generic automation, and research classification.
- Implement review-ready digest artifact generation.
- Add scenarios for bulk transcript, simulated streaming input, loopback topic,
  ambiguous shorthand, and enrichment unavailable.

Demo:

- Run the meeting digest app on a fixture transcript.
- Watch the human-readable logs.
- Inspect topic digest, extracted work items, and review queue item.
- Approve the result locally without publishing externally.

Exit criteria:

- Meeting digest produces useful review-ready output from a real-ish transcript
  without hard-coded AFFiNE, Plane, or home-lab assumptions.

## M9 - Publication Adapters And Optional Home-Lab Live Run

Mirrors:

- LAB-41 Add optional home-lab hosting adapter for RTA apps
- LAB-40 Build meeting digest as the first RTA proving app

Outcome:

Meeting digest can optionally publish approved outputs to configured external
systems and can optionally run in the home lab through an adapter.

Feasible subtasks:

- Define publication adapter contract.
- Implement dry-run publication.
- Implement AFFiNE publication adapter behind review gate.
- Implement Plane/GitHub publication adapter only as optional mirrors or output
  targets, not as core RTA dependencies.
- Implement home-lab hosting adapter that emits WorkloadApp intent.
- Add secrets/config validation without printing secret values.
- Add live-readiness check that proves required adapters are configured.
- Add rollback/failure behavior for partial publication.

Demo:

- Run meeting digest in dry-run publication mode.
- Approve a digest.
- Publish to a local fixture adapter.
- Optional approved lab demo: generate WorkloadApp intent and run the app in the
  home lab.

Exit criteria:

- Meeting digest can be considered live when an approved digest reaches at least
  one configured output adapter with provenance, logs, and review record intact.

## Ticketing Notes

Existing LAB cards are the current mirrors for this plan. The durable RTA work
items are in `work/capabilities`.

If more Plane granularity is needed, split only at independently demoable
boundaries:

- one new card per milestone demo harness
- one new card per external adapter
- one new card per app-specific scenario group

Do not create cards for mechanical implementation steps unless they produce an
independently reviewable result.
