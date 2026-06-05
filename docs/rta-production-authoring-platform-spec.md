# RTA Production Authoring Platform Spec

Date: 2026-06-04

Status: Reset draft for TypeScript/CQRS rebuild

## Executive Summary

RTA is an app-authoring platform for building serious, observable, reviewable applications from domain vocabulary. It should let an agent and a human collaborate from a declared model of the work, generate the boring scaffolding, enforce architectural obligations, fill in the implementation leaves, and optionally deploy the resulting app through deployment adapters.

The first proving app is the meeting digest system: ingest meeting transcripts, segment topics, enrich them with organizational knowledge, extract concrete feature/automation/research work, route the result through human review, and only then publish to systems such as AFFiNE, Plane, GitHub, or other knowledge/task surfaces.

The meeting digest app is not the RTA spec. It is the proving fixture. RTA must remain general enough to author many kinds of apps.

The deeper target is broader: RTA should become the system that turns conversations and intent into hosted, governed, inspectable applications.

## 2026-06-05 Reset Decision

The current implementation in `/Users/virgil/Developer/rta` is rejected as the
production foundation. It may preserve useful product requirements, demo
expectations, and operator lessons, but its `.mjs` runtime shape should not be
finished or polished as the real RTA framework.

The rebuild should start from the stronger RTA-ish sources inventoried in
[rta-ish-source-inventory.md](rta-ish-source-inventory.md), especially
`/Users/virgil/Developer/Virgil-Info/home-lab-v7/vendor/rta-ddd-core` and
`SiderealMollusk/rita-app-framework`.

The new foundation must be:

- TypeScript-first.
- CQRS-first.
- Vocab-first.
- Fixture-proven.
- Generated-sync enforced.
- Built around typed primitive contracts that cannot skip required operation
  lifecycle instrumentation.
- Governed by operation scopes, capability tokens, explicit reasons, and
  deterministic time/randomness where domain logic requires them.

This reset also invalidates the old Plane/formal-review framing for the
prototype. Plane may mirror future work, but the source of truth is the repo:
specs, typed contracts, generated obligations, tests, fixtures, commits, and
demo evidence.

### Required Programming Pattern

RTA primitives should use abstract classes or an equivalent template-method
pattern.

The base primitive owns the public execution method. That public method emits
the required operation events at the right phases, applies correlation and
causation context, calls protected hooks, validates outputs, and records
completion or failure. Descendants implement the protected hooks.

In TypeScript terms, the desired shape is closer to:

```ts
abstract class CommandHandler<C extends Command<string, unknown>> {
  finalHandle(command: C, context: OperationContext): Effect.Effect<void, DomainError> {
    // Emits received/started/completed/failed and preserves the event contract.
    return this.instrumented(command, context, () => this.handleCommand(command, context))
  }

  protected abstract handleCommand(
    command: C,
    context: OperationContext,
  ): Effect.Effect<void, DomainError>

  protected summarize(command: C): OperationSummary {
    return {
      action: command._tag,
      reason: "command received by declared handler",
    }
  }
}
```

TypeScript does not have true `final` methods like C# or Java. RTA should still
design the framework so app authors receive generated subclasses and extension
points that make bypassing the instrumented method an explicit violation caught
by lint/checks/tests.

### CQRS Is Core, Not Optional

RTA must preserve strict CQRS as a core contract:

- Commands return no business result.
- Command outcomes are observed through domain events and projections.
- Queries are read-side only.
- Query handlers must not mutate write models.
- Event handlers are for projections, reactions, process managers,
  notifications, and other side effects.
- The type system and runtime checks must prevent command/query/event families
  from being handled interchangeably.

### Governed Execution Is Also Core

RTA should pull the governed-execution ideas from `rita-app-framework` into the
new TypeScript core:

- Every operation runs inside an `OperationScope` or equivalent runtime context.
- Trust is promoted explicitly: external, internal, command/write-capable,
  system/admin.
- Durable writes require a capability such as `CommitCap`.
- Domain evolution requires a policy/authority token and a human-readable
  reason.
- Unit of Work owns transactional writes and staged domain events.
- Boundary checks and forbidden API scans enforce deterministic, side-effect
  free domain logic.
- Time and randomness must flow through ports, with simulated implementations
  available for tests and scenarios.

### Terminology

Do not use the retired informal log wording as a technical term.

Use:

- `operation lifecycle instrumentation`
- `structured operation events`
- `operation event contract`
- `readable log projection`
- `execution telemetry`

Readable logs are a projection of canonical structured operation events, not
the canonical signal themselves.

## Philosophical Heart

RTA is about order made operational.

It should not be a generic workflow runner. It should not be a pile of code generation tricks. It should be a disciplined authoring loop where meaning, obligations, runtime behavior, and review surfaces are kept connected.

The core belief:

```text
If a system can be described clearly enough,
it can be generated, checked, observed, reviewed, and safely run.
```

RTA treats vocabulary as a real architectural object. A command, event, rule, decision, topic, review gate, connector, or flow is not just a name in code. It is part of a declared world. Once declared, it carries obligations: tests, logs, telemetry, review behavior, provenance, generated files, and implementation leaves.

RTA should make these obligations visible to humans and agents.

## RTA Good, Rita Bad

The project should converge on **RTA** and purge **Rita** from user-facing naming.

Rita created confusion because it sounded like a second identity or runtime separate from RTA. That separation is not useful right now. The description system, generator, checker, runtime, and app scaffolding need to co-evolve.

Use one project name:

```text
RTA
```

Use well-named internal modules instead of separate identities:

```text
vocab
tiers
derivation
ards
generators
checks
cli
runtime
logging
scheduler
review
connectors
hosting
```

The distinction that still matters is internal:

```text
description modules:
  vocab, tiers, derivation, ards, generators, checks

execution modules:
  runtime, logging, scheduler, review, connectors
```

But both are RTA. The CLI is RTA. The generated app is RTA-authored. The runtime contract is RTA.

## Product Goal

RTA should let an agent do this:

```bash
pnpm rta init --template meeting-digest
pnpm rta context
pnpm rta generate
pnpm rta explain obligations
pnpm rta check
pnpm rta dev
```

Then edit implementation leaves and tests until the app passes:

```bash
pnpm rta check
pnpm rta run flow ingest-meeting --input ./samples/transcript.json
pnpm rta graph
pnpm rta review
```

Eventually the same app should be deployable into the home lab:

```text
RTA-authored app
  -> container image
  -> optional hosting adapter
  -> optional home-lab-v7 WorkloadApp
  -> optional Argo/GitOps route
  -> optional backed-up durable state
```

Deployment is not mandatory for an RTA app. Local execution, test fixtures, library-style packages, internal tools, and CLI-only apps are all valid RTA outputs. Home-lab hosting should be native and obvious, but it is an adapter path, not a core requirement.

## Repository Shape

Use a single production monorepo.

```text
rta/
  README.md
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  docs/
    vision.md
    authoring-loop.md
    vocabulary.md
    tiers.md
    derivation-graph.md
    ard-system.md
    generator-contract.md
    runtime-contract.md
    operation-event-logs.md
    review-gates.md
    hosting-adapters.md
    meeting-digest-seed.md
    agent-playbook.md
    salvage-plan.md

  packages/
    vocab/
      src/
        schemas/
          context.ts
          aggregate.ts
          command.ts
          event.ts
          query.ts
          read-model.ts
          rule.ts
          decision.ts
          reaction.ts
          process-manager.ts
          flow.ts
          task.ts
          review-gate.ts
          connector.ts
          provenance.ts
          ui.ts
        parse.ts
        index.ts
      test/

    tiers/
      src/
        t1-primitives.ts
        t2-patterns.ts
        t3-archetypes.ts
        contracts.ts
        registry.ts
      test/

    derivation/
      src/
        derive-obligations.ts
        derive-telemetry.ts
        derive-operation-events.ts
        derive-review-gates.ts
        derive-use-case-obligations.ts
        derive-scenario-coverage.ts
        derive-provenance.ts
        derivation-graph.ts
        explain.ts
      test/

    use-cases/
      src/
        use-case-schema.ts
        scenario-schema.ts
        boundary-coverage.ts
        scenario-runner.ts
        scenario-reporter.ts
      test/

    app-wiring/
      src/
        app-runtime-schema.ts
        process-topology.ts
        port-registry.ts
        adapter-binding.ts
        scenario-targets.ts
        wiring-validator.ts
      test/

    app-cli/
      src/
        app-cli-generator.ts
        command-surface.ts
        scenario-command-surface.ts
        review-command-surface.ts
        ops-command-surface.ts
      test/

    work-ledger/
      src/
        capability-schema.ts
        feature-schema.ts
        work-linker.ts
        demo-coverage.ts
        export-plane.ts
        export-github.ts
      test/

    ards/
      src/
        schema.ts
        meta.ts
        runner.ts
        reporter.ts
      test/

    generators/
      src/
        context-generator.ts
        obligation-test-generator.ts
        telemetry-test-generator.ts
        operation-event-generator.ts
        review-gate-generator.ts
        use-case-test-generator.ts
        scenario-test-generator.ts
        app-cli-generator.ts
        app-wiring-generator.ts
        process-generator.ts
        route-generator.ts
        runtime-contract-generator.ts
        registry-generator.ts
        ui-affordance-generator.ts
      test/

    checks/
      src/
        generated-sync.ts
        obligation-coverage.ts
        telemetry-coverage.ts
        operation-event.ts
        pattern-contracts.ts
        archetype-bindings.ts
        derived-obligations.ts
        vocab-lint.ts
        dependency-boundaries.ts
        connector-safety.ts
        use-case-coverage.ts
        scenario-coverage.ts
        boundary-coverage.ts
        integration-contracts.ts
        app-cli.ts
        runtime-wiring.ts
        scenario-runtime-parity.ts
      test/

    cli/
      src/
        rta.ts
        commands/
          init.ts
          context.ts
          generate.ts
          check.ts
          lint.ts
          explain.ts
          graph.ts
          dev.ts
          run.ts
          review.ts
          scenario.ts
          test-scenario.ts
          doctor.ts
      bin/
        rta.ts

    runtime/
      src/
        app.ts
        unit-of-work.ts
        context.ts
        effects.ts
        flow-runner.ts
        ports.ts
      test/

    logging/
      src/
        logger.ts
        operation-event.ts
        verbosity.ts
      test/

    scheduler/
      src/
        clock.ts
        scheduler.ts
        simulated-clock.ts
      test/

    review/
      src/
        review-gate.ts
        review-queue.ts
        approval-policy.ts
      test/

    connectors/
      src/
        ports.ts
        adapters/
          affine.ts
          plane.ts
          otter.ts
          github.ts
      test/

    hosting-adapters/
      src/
        workload-app-generator.ts
        docker-generator.ts
        healthcheck-generator.ts
      test/

  patterns/
    guard.pattern.yaml
    classifier.pattern.yaml
    availability.pattern.yaml
    lifecycle.pattern.yaml
    extractor.pattern.yaml
    enricher.pattern.yaml
    review-gate.pattern.yaml
    publisher.pattern.yaml

  archetypes/
    scheduler.archetype.yaml
    ledger.archetype.yaml
    flow-app.archetype.yaml
    research-pipeline.archetype.yaml

  ards/
    ci/
    t1/
    t2/
    t3/
    runtime/
    app-authoring/

  fixtures/
    golden/
      pass/
      fail/
      golden-fixture.manifest.json

  examples/
    flow-minimal/
    meeting-digest-seed/

  scripts/
    check-golden-fixture.mjs
    check-sample-app-loop.mjs
```

## The App RTA Generates

An RTA-authored app is a TypeScript service with a small operational UI, a declared vocabulary, generated scaffolding, explicit obligations, human review gates, and deployment metadata.

Example generated app:

```text
meeting-digest/
  rta.config.ts
  package.json
  Dockerfile

  vocab/
    contexts/
      meeting-intake.context.yaml
      topic-segmentation.context.yaml
      knowledge-enrichment.context.yaml
      work-extraction.context.yaml
      human-review.context.yaml
      publication.context.yaml
    connections/
      meeting-digest.connections.yaml
    bindings/
      meeting-digest.archetype.yaml
    ui/
      topic-review-panel.view.yaml
      provenance-graph.view.yaml

  generated/
    registry.ts
    commands.ts
    events.ts
    routes.ts
    runtime-contract.ts
    obligation-manifest.json
    provenance-schema.ts
    review-gates.ts
    operation-events.ts

  src/
    handlers/
      SegmentTranscript.ts
      EnrichTopic.ts
      ExtractWorkItems.ts
      PublishDigest.ts
    policies/
    projections/
    adapters/
      otter.ts
      affine.ts
      plane.ts

  test/
    obligations/
    integration/

  app/
    monitor-ui/

  deploy/
    workload-app.yaml
    k8s/
    maintenance/
```

The app has three primary edit zones:

```text
vocab/       what the app means
src/         what the app does
app/         how humans watch and review it
```

Generated files are either regenerated or generated-once. RTA must mark this explicitly in generated headers.

## CLI Contract

The CLI is the agent's primary working surface.

Required commands:

```text
rta init
rta context
rta generate
rta check
rta lint
rta explain
rta graph
rta dev
rta run
rta review
rta scenario
rta test-scenario
rta work
rta extensions
rta upstream
rta doctor
```

### `rta init`

Creates a new RTA-authored app or initializes RTA in an existing repo.

Examples:

```bash
pnpm rta init --template flow-app
pnpm rta init --template meeting-digest
pnpm rta init --root .
```

It should scaffold:

```text
vocab/
ards/
AGENTS.md
rta.config.ts
src/
test/
generated/
```

It should create at least one spirit ARD and one letter ARD so the ARD loop is present from the start.

### `rta context`

Prints the declared world:

```text
contexts
aggregates
commands
events
queries
rules
decisions
flows
review gates
connectors
bindings
```

Agents should run this before editing.

### `rta generate`

Reads vocab, patterns, archetypes, bindings, and config. Produces code, tests, telemetry expectations, operation event contracts, review gates, routes, registry, and hosting metadata.

Generated output should include a vocab hash or derivation hash.

In strict mode, generated command and query handlers must be primitive
subclasses:

```text
CommandNameHandler extends InstrumentedCommandHandler
QueryNameHandler extends InstrumentedQueryHandler
```

Event handlers use the same protected-hook pattern:

```text
EventNameHandler extends InstrumentedEventHandler
```

The generated public compatibility functions may remain for registries and
runtime wiring, but they must delegate through the primitive instance so
operation events cannot be skipped.

Generated registries must expose a runnable CQRS surface:

```text
dispatch(operation, raw, scope?)
dispatchCommand(operation, raw, scope?)
dispatchQuery(operation, raw, scope?)
```

The registry may perform dynamic lookup and layer provision, but leaf behavior
must still live in generated or authored primitive subclasses.

### `rta check`

Runs the full enforcement surface.

Required modes:

```text
--ard-meta
--generated-sync
--tier-contracts
--pattern-specs
--pattern-contracts
--archetype-specs
--archetype-bindings
--derived-obligations
--obligation-coverage
--telemetry-coverage
--operation-event
--primitive-boundaries
--production
--review-gates
--connector-safety
--dependency-boundaries
--use-cases
--scenario-coverage
--boundary-coverage
--integration-contracts
--app-cli
--runtime-wiring
--scenario-runtime-parity
--work-ledger
--demo-coverage
--extensions-local
--extensions-upstreamable
```

Default `rta check` should run all production gates.

`--extensions-local` answers:

```text
Can this app safely use its local extensions?
```

`--extensions-upstreamable` answers:

```text
Could this local extension move into core RTA without a rewrite?
```

### `rta lint`

Checks that vocab is useful to agents and humans.

At minimum:

```text
description required for all declared primitives
guidance required for contexts, commands, events, queries, flows, review gates, connectors
uncertainty and external side effects must be explicit
connector vocab must name data sensitivity and write behavior
```

### `rta extensions`

Lists extension scopes and health.

Example output:

```text
app-local:
  topic-extractor        experimental   local-safe   used by TopicSegmentation.ExtractTopics
  reviewable-publisher   candidate      upstream-gap used by Publication.PublishApprovedDigest
```

### `rta upstream`

Plans and performs promotion of app-local extensions into core RTA.

Examples:

```bash
pnpm rta upstream plan topic-extractor
pnpm rta upstream promote topic-extractor
```

`promote` must refuse unless `rta check --extensions-upstreamable` passes for the selected extension.

## Generated App CLI And Runtime Wiring

RTA has an authoring CLI. Every authored app should also get an operational CLI.

The distinction:

```text
rta
  authoring, generation, checking, explanation, upstreaming

<app>
  running, operating, reviewing, replaying, debugging, scenario execution
```

Example for a generated app:

```bash
meeting-digest ingest transcript ./sample.json
meeting-digest run flow IngestTranscript
meeting-digest scenario list
meeting-digest scenario run approved-digest-publishes-work-items --target local
meeting-digest scenario replay run_123
meeting-digest review list
meeting-digest review approve review_123
meeting-digest graph run run_123
meeting-digest logs tail
meeting-digest doctor
```

The app CLI should be generated from:

```text
vocab
use cases
scenarios
runtime contract
review gates
connector declarations
app wiring config
```

### App CLI Surface

Every generated app CLI should include:

```text
<app> dev
<app> start
<app> status
<app> run command <CommandName>
<app> run flow <FlowName>
<app> scenario list
<app> scenario run <ScenarioName>
<app> scenario replay <RunId>
<app> review list
<app> review approve <ReviewId>
<app> review reject <ReviewId>
<app> graph run <RunId>
<app> logs tail
<app> doctor
```

Production-capable apps may also include:

```text
<app> api start
<app> worker start
<app> scheduler start
<app> migrate
<app> health
<app> backup
<app> restore-check
```

Commands should be generated only when the app declares the needed capability. A CLI-only app does not need `api start`. An app with no scheduler does not need `scheduler start`.

Current generated-app baseline:

```text
src/main.ts
  invokes generated registry dispatch for the default command

src/app-cli.ts
  list
  run
  scenario
  watch --trace

package scripts
  pnpm generate
  pnpm app:build
  pnpm app:run
  pnpm app:scenario
  pnpm app:watch
  pnpm check
```

This baseline is intentionally smaller than the final app CLI surface, but it
must prove the important contract: generated vocab produces generated registry
dispatch, the app CLI calls that dispatch, and `watch --trace` prints readable
primitive operation logs. The sample-app loop must fail if this path stops
working.

Generated leaves should include strict primitive subclasses for every declared
message-handling responsibility:

```text
command -> InstrumentedCommandHandler
query -> InstrumentedQueryHandler
connection reaction -> InstrumentedEventHandler
```

Reaction event handlers are generated from connection vocab. They should log
the incoming event, declared command outputs, and derivation lineage even before
the app author fills in concrete command mapping code. Generated registries
should expose `dispatchEvent` alongside `dispatchCommand` and `dispatchQuery`
so event-handler leaves can be invoked by local scenarios, workers, and later
production wiring.

### Scenario Targets

Scenarios should run against explicit targets:

```text
memory
  no durable state, fake connectors, fastest test path

local
  local DB/storage, mocked or configured connectors

staging
  real runtime, controlled adapters

production
  safe scenarios only, usually dry-run or read-only unless explicitly approved
```

Example:

```bash
meeting-digest scenario run approved-digest-publishes-work-items --target memory
meeting-digest scenario run approved-digest-publishes-work-items --target local
meeting-digest scenario run approved-digest-publishes-work-items --target production --dry-run
```

A scenario run should produce:

```text
run id
commands handled
events emitted
review gates opened/resolved
connector calls attempted
external writes blocked/performed
logs
provenance graph
assertions passed/failed
```

### Runtime Wiring Contract

Every production-capable app should declare an app runtime wiring contract.

Example:

```yaml
kind: AppRuntime
name: meeting-digest
processes:
  - name: api
    roles: [commands, queries, review-api]
  - name: worker
    roles: [flows, connectors]
  - name: scheduler
    roles: [scheduled-work]
storage:
  state: sqlite
  artifacts: filesystem
connectors:
  otter:
    mode: read
    adapter: otter
  affine:
    mode: write-after-review
    adapter: affine
  plane:
    mode: write-after-review
    adapter: plane
review:
  requiredBeforeExternalWrites: true
```

Minimum topology:

```text
api
  command/query/review API

worker
  queued flows and commands

scheduler
  scheduled work

ui
  monitoring, review queue, provenance graph

store
  app state, run state, projections, review queue

artifact store
  source artifacts, generated outputs, evidence bundles

connectors
  adapters for external systems
```

Small apps may collapse this into one process:

```text
<app> start
  api + worker + scheduler + ui
```

Larger apps may split:

```text
<app> api start
<app> worker start
<app> scheduler start
```

### Runtime Parity Rule

The generated app CLI, scenario runner, local dev server, and production worker should use the same app runtime wiring.

They may differ by adapter configuration:

```text
memory target
  in-memory store, fake connectors

local target
  local store, local/mocked connectors

production target
  production store, production connectors, review/write policies enforced
```

They should not differ by hidden execution path.

Contractual rules:

```text
every command/flow/use case invoked by a scenario is invokable through the generated app CLI
every production process is declared in app runtime wiring
every connector is wired through a port, not imported directly
every scenario target uses the same runtime wiring with different adapters
production scenarios cannot perform external writes unless explicitly marked safe and review-gated
```

Required checks:

```text
rta check --app-cli
rta check --runtime-wiring
rta check --scenario-runtime-parity
```

## Work Ledger And Demo Coverage

The CLI is necessary, but it is not sufficient for tracking what RTA is building.

RTA needs a first-class work ledger: a vocab-aware product/work registry for capabilities, features, research threads, decisions, waivers, upstream candidates, and demo coverage.

The work ledger is not a full project manager. It is the connective tissue between:

```text
capabilities
features
use cases
scenarios
vocab declarations
patterns/archetypes
ARDs
waivers
Plane/GitHub cards
demo coverage
```

Suggested app/repo layout:

```text
work/
  capabilities/
    generated-app-cli.capability.yaml
  features/
    scenario-runner.feature.yaml
  decisions/
    sqlite-first.decision.yaml
  research/
    otter-realtime-options.research.yaml
  upstream-candidates/
    topic-extractor.upstream.yaml
```

Example capability:

```yaml
kind: Capability
name: GeneratedAppCli
status: in-progress
why: Operators need to run, inspect, review, and replay authored apps.
ownedBy:
  plane: LAB-39
demonstratedBy:
  - scenario: approved-brief-publishes-work-items
  - plane: LAB-47
requires:
  - AppRuntime
  - ScenarioRunner
  - ReviewGate
produces:
  - generated/app-cli.ts
  - generated/processes.ts
```

### `rta work`

`rta work` should operate the ledger.

Examples:

```bash
rta work list
rta work show generated-app-cli
rta work link generated-app-cli --use-case ReviewAndPublishResearchBrief
rta work link generated-app-cli --scenario approved-brief-publishes-work-items
rta work status generated-app-cli --state demo-covered
rta work export --target plane
rta work export --target github
```

### Demo Coverage Contract

Every nontrivial capability must have a proving path.

That path may be direct:

```text
run this command
open this page
watch this log
inspect this generated artifact
```

Or it may be proof-through-integration:

```text
LAB-39 generated app CLI is demo-covered by LAB-47 because the end-to-end demo
uses the generated CLI without bypassing its runtime wiring.
```

Contractual rules:

```text
every nontrivial capability has an owner
every capability has at least one proving path
every proving path points to a direct demo or integration scenario
every upstream candidate links to the work item that discovered it
every Plane/GitHub export preserves the RTA work id
every Human Review card declares direct demo or proof-through-integration coverage
```

Required checks:

```text
rta check --work-ledger
rta check --demo-coverage
```

### `rta explain`

Explains why something exists.

Examples:

```bash
pnpm rta explain obligation topic-segmentation.integration-claim
pnpm rta explain generated src/generated/review-gates.ts
pnpm rta explain command SegmentTranscript
```

The output should show the derivation chain:

```text
missing obligation:
  scheduler.claim-event.integration-claim

derived from:
  T3 scheduler archetype
  requires lifecycle pattern
  bound claim-event -> MeetingTopicClosed
  expected generated test:
    generated-tests/MeetingDigest/MeetingTopicClosed.integration-claim.test.ts
```

### `rta graph`

Shows the derivation/provenance graph.

Modes:

```text
--derivation
--runtime
--provenance
--review
```

### `rta dev`

Starts the local app:

```text
API/runtime service
monitor UI
local queue/store
simulated scheduler/time controls
connector mocks unless real connector config is enabled
```

### `rta run`

Runs a flow, command, scenario, or replay.

Examples:

```bash
pnpm rta run flow ingest-meeting --input ./samples/transcript.json
pnpm rta run scenario topic-loopback
```

### `rta review`

Opens or serves the human review queue.

Review should be a first-class RTA primitive, not an afterthought.

## Vocab

Vocab is the canonical declaration of what exists.

It should cover:

```text
bounded contexts
aggregates
entities
value objects
commands
events
queries
read models
rules
decisions
reactions
process managers
flows
steps
tasks
review gates
connectors
projections
UI affordances
provenance events
```

Vocab exists so agents can reason from declared architecture instead of guessing from code.

Every primitive should have enough natural-language metadata for an agent to act without out-of-band context.

Required fields should include:

```text
name
description
guidance
owner context
input/output shape
side effects
data sensitivity
review requirements
patterns/archetypes applied
```

## Use Cases And Scenarios

Vocab says what exists. Use cases say what a user or system is trying to accomplish. Scenarios make those goals executable.

This layer is required because primitive, pattern, and archetype tests do not prove that the app actually satisfies a human goal across bounded contexts.

RTA should treat use cases and scenarios as first-class authored artifacts:

```text
use-cases/
  review-and-publish-digest.use-case.yaml

scenarios/
  approved-digest-publishes-work-items.scenario.yaml
  external-write-blocked-before-review.scenario.yaml
```

### Use Cases

A use case captures intent.

Example:

```yaml
kind: UseCase
name: ReviewAndPublishResearchBrief
primaryActor: HumanReviewer
goal: Publish an approved enriched brief and proposed work items from an input artifact
startsWith:
  command: IngestSourceArtifact
endsWith:
  event: BriefPublished
boundedContexts:
  - Intake
  - Enrichment
  - WorkExtraction
  - HumanReview
  - Publication
successPath:
  - source artifact ingested
  - salient claims extracted
  - claims enriched with knowledge references
  - proposed work items extracted
  - human approves brief
  - approved brief published
acceptanceCriteria:
  - published claims link back to source evidence
  - proposed work items include goal, user, systems, and uncertainty
  - no external write happens before approval
```

Use cases should be human-readable enough for an agent to understand the product goal, not merely a test fixture.

### Scenarios

A scenario is an executable example for a use case.

Example:

```yaml
kind: Scenario
name: approved-brief-publishes-work-items
useCase: ReviewAndPublishResearchBrief
given:
  sourceArtifact: fixtures/source/basic-brief-input.json
  knowledge:
    - fixtures/knowledge/core-touchstones.json
when:
  - command: IngestSourceArtifact
  - command: ApproveBrief
then:
  - event: BriefPrepared
  - event: WorkItemsExtracted
  - event: BriefApproved
  - event: BriefPublished
assert:
  - no external write before BriefApproved
  - every work item has type, goal, user, systems, uncertainty
  - provenance graph links source spans to output claims
```

Scenarios are the bridge between vocabulary and behavior. They should exercise one or more bounded contexts, review gates, connector policies, and provenance expectations.

### Inter-Bounded-Context Tests

RTA should generate/check boundary tests from vocab connections plus scenarios.

Boundary tests should prove:

```text
cross-context edges are declared
declared edges are exercised by at least one scenario
contexts do not call across forbidden boundaries
one context does not mutate another context's state directly
external publication contexts cannot be reached before review approval
```

Example:

```text
Intake emits SourceArtifactIngested
Enrichment consumes SourceArtifactIngested
WorkExtraction consumes EnrichedClaim
Publication consumes ApprovedBrief
```

RTA should check that each declared cross-context connection is covered by at least one scenario.

### Integration Tests

Integration tests prove the runtime path, not just the vocabulary path.

They should cover:

```text
unit of work execution
flow runner behavior
storage/projection updates
review gate enforcement
connector adapter behavior
external write blocking
operation lifecycle instrumentation
provenance graph emission
scheduled work where relevant
```

Every external write path must have an integration scenario proving it is review-gated.

### Contractual Rules

For production checks:

```text
every app must declare at least one use case
every use case must have at least one executable scenario
every bounded-context connection must be covered by at least one scenario
every external write path must be covered by a review-gated integration scenario
every scenario must reference declared vocab
every scenario assertion must map to a checkable event, state, log, review, connector, or provenance condition
```

Local development may allow incomplete scenarios as warnings. `rta check --production` must fail on missing use-case/scenario/boundary coverage.

## Vocabulary Expansion Process

The default posture is conservative.

The given T1 primitives should be sufficient for most new apps. Most things an agent authors for an app should be instances of existing primitives or extensions of existing T2 patterns. New primitives should be rare.

Primitives and patterns are abstract. They are not app behavior by themselves.

An app cannot instantiate "a guard" or "a classifier" as a finished thing. The app must define a concrete application-specific rule, decision, flow, or task that applies the pattern.

Example:

```text
abstract primitive:
  Rule

abstract pattern:
  guard

concrete app declaration:
  TopicMustHaveEvidenceBeforePublication
    kind: Rule
    pattern: guard
    violation: TopicEvidenceMissing
```

The abstract layer provides vocabulary, obligations, generated scaffolding, and checks. The concrete app declaration provides the actual domain meaning.

Expansion order:

```text
1. Try to model the app using existing T1 primitives.
2. If a recurring shape appears, define or extend a T2 pattern.
3. If several patterns form a reusable domain template, define a T3 archetype.
4. Only add a new T1 primitive when existing primitives cannot honestly express the concept.
```

### Expanding T1 Primitives

T1 is the floor. Adding a primitive changes the language.

A new primitive is justified only when:

```text
the concept recurs across apps
it cannot be represented as a Command/Event/Rule/Decision/Flow/Task/etc.
it implies distinct generated artifacts or runtime behavior
it carries distinct testing/logging/review/provenance obligations
agents would be misled if it were modeled as an existing primitive
```

Adding a primitive requires:

```text
schema
parser tests
lint metadata rules
base obligations
generator behavior or explicit no-op rationale
check behavior
ARD coverage
docs
golden fixture coverage
agent guidance
```

### Expanding T2 Patterns

T2 is the normal app-authoring extension point.

Most app-specific authoring should happen by declaring pattern instances or adding patterns. A pattern names a recurring semantic shape over existing primitives.

Patterns are abstract semantic templates. They do not run. They must be applied to concrete app declarations.

Example:

```text
guard pattern:
  "a rule that blocks progress unless a precondition is true"

concrete app guard:
  "TopicMustHaveEvidenceBeforePublication"
```

A new pattern requires:

```text
PatternSpec YAML
requiredPrimitives
testingContract.extends
testingContract.adds
vocabHint
visualConcepts
narrativeLabel
pattern-contract check coverage
generated obligation examples
agent docs
```

Pattern rule:

```text
Patterns may only add obligations to their required primitives.
Patterns may not remove or weaken inherited T1 obligations.
```

This matters because an agent should be able to apply a pattern and know that the app became more specific, not less safe.

### Expanding T3 Archetypes

Archetypes are special.

They should not be used for every domain noun. A T3 archetype is a reusable domain template composed from patterns, roles, bindings, and a derived test plan.

Unlike a T2 pattern, an archetype can describe a functional organ that appears in multiple apps. It is still abstract until bound to app vocabulary, but it is a bigger reusable shape than a pattern.

Example:

```text
archetype:
  scheduler

meaning:
  a reusable functional organ for claiming, releasing, timing, retrying,
  and observing scheduled work

possible app instances:
  meeting follow-up scheduler
  backup job scheduler
  probe scheduler
  report generation scheduler
```

Archetypes are like organs in related species: recognizable structure, reusable roles, different concrete names and local behavior in each app.

A new archetype is justified when:

```text
the shape recurs across apps or contexts
the shape has meaningful semantic roles
the shape composes multiple patterns
the derived test plan is useful and repeatable
the visual/provenance story is recognizable
```

A new archetype requires:

```text
ArchetypeSpec YAML
requiredPatterns
inputRoles
outputRoles
testPlan
visualGuidance
narrativeLabel
binding completeness check
derived obligation generation
example binding
golden fixture coverage
agent docs
```

Archetypes should remain relatively few. They are the vocabulary's high-level reusable forms, not a bucket for every app feature.

### Agent Process For Expanding Vocabulary

Agents should follow this loop:

```bash
pnpm rta context
pnpm rta explain gaps
pnpm rta propose pattern <name>
pnpm rta generate
pnpm rta check
```

`rta propose pattern` and similar commands can be added later, but the procedure should exist from the start:

```text
describe the recurring shape
show why existing patterns are insufficient
name inherited T1 obligations
name added obligations
add or update ARDs/checks if the expansion changes enforcement
update docs so future agents understand when to use it
add a golden fixture or example
```

Every expansion should leave a trail that answers:

```text
Why does this vocabulary element exist?
What does it inherit?
What does it add?
How is it enforced?
How should an agent use it?
```

### App-Local Extensions And Upstreaming

There are three extension scopes:

```text
core RTA vocabulary
  stable primitives, patterns, archetypes, ARDs, checks, and generators

app-local vocabulary
  concrete declarations and local extensions used by one app

candidate upstream extensions
  app-local patterns/archetypes that have proven reusable enough to promote
```

An app may define local patterns and local archetype bindings, but core RTA should treat those as app-owned unless they are explicitly promoted.

Suggested layout in an authored app:

```text
vocab/
  contexts/
  connections/
  bindings/
  extensions/
    manifests/
    patterns/
    archetypes/
    ards/
    docs/
```

Core RTA layout:

```text
patterns/
archetypes/
ards/
packages/
```

Promotion path:

```text
app-local concrete use
  -> app-local pattern
  -> repeated in another context/app
  -> candidate upstream pattern with docs and checks
  -> core RTA pattern
  -> optional archetype if multiple patterns form a reusable organ
```

This keeps app authorship flexible without letting every app-specific idea immediately pollute the core vocabulary.

### Extension Manifest

Every local extension should have a manifest. The manifest makes low-friction local authoring compatible with clean upstreaming later.

Example:

```yaml
kind: ExtensionSpec
name: topic-extractor
scope: app-local
stability: experimental
upstreamCandidate: true
owner: meeting-digest
extends:
  - extractor
usedBy:
  - TopicSegmentation.ExtractTopics
addsObligations:
  - topic-boundary-detected
  - evidence-spans-preserved
  - uncertainty-marked
promotion:
  genericName: content-extractor
  forbiddenTerms:
    - meeting
    - otter
    - affine
    - plane
  requiredFixtures:
    - fixtures/extensions/content-extractor/pass/basic.yaml
    - fixtures/extensions/content-extractor/fail/missing-evidence.yaml
```

### Local Extension Enforcement

`rta check --extensions-local` should require:

```text
valid ExtensionSpec
scope: app-local
owner app or context
description
guidance
inherits/extends declaration
added obligations
no weakened inherited obligations
at least one concrete app use
generated obligation stubs
passing app-local ARDs
stable derivation ids
```

This should be cheap enough that agents can create local extensions during normal app work.

### Upstreamable Extension Enforcement

`rta check --extensions-upstreamable` should require all local checks plus:

```text
no app-specific name unless promotion.genericName is declared
no app-specific connector assumptions
generic docs
at least one app-independent fixture
pass/fail golden fixture coverage
core-compatible ARD id shape or promotion mapping
stable derivation ids
no hard dependency on home-lab adapter
no hard dependency on meeting digest
promotion manifest
```

This can be warn-only while experimenting, but `rta upstream promote` must require it.

### Promotion Plan

`rta upstream plan <extension>` should explain the gap between local-safe and upstreamable.

Example:

```text
topic-extractor is local-safe but not upstreamable

missing:
  generic docs
  app-independent fixture
  forbidden term: meeting
  no golden fail fixture
  no core ARD mapping

safe to use locally: yes
safe to promote: no
```

Promotion should be a file move plus metadata tightening, not a rewrite.

```text
from:
  examples/meeting-digest-seed/vocab/extensions/patterns/topic-extractor.pattern.yaml

to:
  patterns/content-extractor.pattern.yaml
```

### Scope-Aware Derivation IDs

Extension derivation IDs should include scope.

Examples:

```text
app:meeting-digest.pattern:topic-extractor.obligation:evidence-spans-preserved
core:pattern:content-extractor.obligation:evidence-spans-preserved
```

When an extension is promoted, RTA should preserve aliases so old app tests and provenance do not break immediately.

```yaml
aliases:
  - app:meeting-digest.pattern:topic-extractor
```

This keeps the low-friction local path while making upstreaming mechanical.

## Tiers

The tier model is central.

### T1: Primitives

T1 defines the base floor.

Examples:

```text
Command
Event
Query
Rule
Decision
Reaction
ProcessManager
Flow
Task
ReviewGate
Connector
Projection
OperationEventContract
```

T1 asks:

```text
What is this kind of thing?
What metadata must it carry?
What basic obligations does every instance inherit?
What generated/runtime surface does it imply?
```

### T2: Patterns

T2 specializes primitives without weakening them.

Examples:

```text
guard
availability
classifier
lifecycle
extractor
enricher
review-gate
publisher
```

Pattern example:

```yaml
kind: PatternSpec
name: guard
requiredPrimitives: [Rule]
testingContract:
  extends: rule-two-case
  adds:
    - valid-pre-state: construct aggregate in required state and pass
    - wrong-state: construct aggregate outside required state and fail
```

Rule:

```text
T2 may add obligations to T1.
T2 may not remove or weaken T1 obligations.
```

### T3: Archetypes

T3 composes patterns into reusable domain shapes.

Examples:

```text
scheduler
ledger
flow-app
research-pipeline
```

Archetype example:

```yaml
kind: ArchetypeSpec
name: research-pipeline
requiredPatterns:
  - extractor
  - enricher
  - review-gate
  - publisher
inputRoles:
  - source-artifact
  - knowledge-source
outputRoles:
  - enriched-brief
  - proposed-work-item
  - publication
testPlan:
  - extract-salient-claims
  - enrich-with-context
  - classify-proposed-work
  - require-human-review
  - publish-approved-output
```

### Progressive Concretization

The "blooming" model should be explicit:

```text
T1 primitive contract
  -> T2 pattern specialization
  -> T3 archetype composition
  -> concrete app binding
  -> generated code/tests/logs/review gates
```

Example:

```text
T1:
  A Rule needs two-case coverage.

T2:
  A guard is a Rule and adds valid-pre-state/wrong-state obligations.

T3:
  A meeting digest topic lifecycle uses guard + classifier + lifecycle.

Binding:
  claim-event = TopicOpened
  release-event = TopicClosed

Generation:
  TopicOpened/TopicClosed tests, logs, review gates, and provenance edges appear.
```

Blooming is transitive and enforceable, not only descriptive.

If a concrete app vocabulary item extends a T2 pattern, it inherits the T1
primitive contracts under that pattern. If it extends a T3 archetype, it
inherits every primitive/pattern obligation in that archetype chain. The
derived obligations, required operation events, generated artifacts, and
production checks must use the bloomed chain.

This means an app-local `TopicSegmenter` that extends a topic-segmentation
pattern still owes the underlying input primitive operation event. It cannot
only declare `TopicSegmenter.segment` and silently skip `TopicSegmenter.read`.
Likewise, a reusable job archetype that composes input and artifact primitives
owes read, write, and archetype-specific materialization operation events.

Tier contracts should reject cycles and should reject duplicate parent
obligations/events in child contracts. Children add obligations; they do not
redeclare inherited ones.

## Testing And Obligation Model

The testing model should be layered, additive, and derivation-backed.

The reason this works is that every testing requirement has a source:

```text
T1 primitive obligations
  baseline for a kind of thing

T2 pattern obligations
  additive specialization of the baseline

T3 archetype obligations
  composed domain-level test plan over semantic roles

App binding obligations
  concrete tests produced by substituting real app vocab for archetype roles

Use-case obligations
  actor/system goals that cross one or more bounded contexts

Scenario obligations
  executable examples that prove use cases and boundary behavior

Runtime obligations
  logs, telemetry, review gates, connector behavior, and provenance expected while running
```

### T1 Testing

T1 defines minimum coverage for primitives.

Examples:

```text
Rule
  pass case
  fail case with declared violation

Decision
  declared outcomes covered
  fallback/default behavior covered where applicable

Reaction
  trigger handled
  emitted commands covered
  no-op/conditional branches covered where declared

ProcessManager
  nominal progression
  branch/retry/timeout paths where declared

Connector
  validates external input
  records side-effect intent
  honors review/write policy
```

T1 is the minimum floor. If a primitive exists, its floor obligations exist.

### T2 Testing

T2 adds specific obligations based on semantic pattern.

Example:

```text
Rule baseline:
  pass case
  fail case

guard pattern adds:
  valid-pre-state
  wrong-state

availability pattern adds:
  unclaimed/available
  already-held/unavailable
```

This is why pattern obligations must be additive only. A pattern is not a way to escape the primitive's testing floor. It is a way to make the floor more specific.

### T3 Testing

T3 creates a derived test plan.

An archetype does not usually introduce new primitive mechanics. It composes patterns and names semantic roles.

Example:

```text
scheduler archetype:
  requires guard + availability + lifecycle
  input roles: claim-event, release-event
  output roles: claimed, released
  derived plan:
    guard two-case test
    availability two-case test
    lifecycle outcome coverage
    integration claim path
    integration release path
```

The app binding turns those abstract roles into concrete tests:

```text
claim-event -> TopicOpened
release-event -> TopicClosed
claimed -> TopicAcceptedForDigest
released -> TopicReturnedForMoreEvidence
```

Generated stubs should use the concrete names, but their explanation should point back to the archetype role.

### Test Artifact Types

RTA should generate or check six classes of test artifacts:

```text
obligation tests
  prove primitive and pattern obligations

derived archetype tests
  prove role-bound domain test plans

use-case tests
  prove actor/system goals across one or more bounded contexts

boundary tests
  prove declared context connections are respected and exercised

runtime contract tests
  prove unit-of-work, scheduler, review gate, connector, and publication behavior

golden fixtures
  prove the RTA toolchain itself still generates and checks correctly
```

### Why This Is Coherent

The model is defensible if RTA preserves these invariants:

```text
every obligation has a derivation source
every generated test has a stable obligation id
every obligation id can be explained
patterns only add obligations
archetype bindings must be complete before derived tests appear
use cases must be backed by executable scenarios
bounded-context connections must be scenario-covered
runtime side effects have review/log/provenance obligations
golden fixtures prove the toolchain, not the app
```

If those invariants hold, the testing model is not arbitrary. It is a mechanical consequence of the declared vocabulary.

### Required Checks

Testing-related checks should include:

```text
rta check --generated-sync
rta check --tier-contracts
rta check --pattern-contracts
rta check --archetype-bindings
rta check --derived-obligations
rta check --obligation-coverage
rta check --telemetry-coverage
rta check --operation-event
rta check --review-gates
rta check --connector-safety
rta check --use-cases
rta check --scenario-coverage
rta check --boundary-coverage
rta check --integration-contracts
```

Local `rta dev` may run with warnings for unfinished obligation TODOs. Production checks must fail unless obligations are covered or explicitly waived.

Waivers should exist, but they are review artifacts:

```text
waiver id
obligation id
reason
scope
expiration or revisit condition
approver
```

Unchecked waivers should not be allowed.

## Derivation Engine

The derivation engine is the heart of the production-grade refactor.

It should answer:

```text
Given vocab + patterns + archetypes + bindings,
what obligations, generated artifacts, logs, telemetry, review gates,
use-case coverage, scenario coverage, boundary coverage,
provenance edges, and runtime contracts must exist?
```

Core APIs:

```ts
deriveObligations(input): Obligation[]
deriveTelemetry(input): TelemetryExpectation[]
deriveOperationEventContracts(input): OperationEventContract[]
deriveReviewGates(input): ReviewGateRequirement[]
deriveUseCaseObligations(input): UseCaseObligation[]
deriveScenarioCoverage(input): ScenarioCoverageRequirement[]
deriveBoundaryCoverage(input): BoundaryCoverageRequirement[]
deriveProvenance(input): ProvenanceEdge[]
deriveRuntimeContract(input): RuntimeContract
deriveGraph(input): DerivationGraph
explainDerivation(nodeId): Explanation
```

Every derived item should include:

```text
stable id
source tier
source primitive/pattern/archetype
concrete binding
expected generated artifact
required check
human-readable explanation
```

Checks and generators should consume derivation output. They should not each rediscover obligations separately.

## Core/App Relationship

The relationship between RTA core and an authored app is intentionally layered.

RTA core owns:

```text
primitive schemas
core pattern specs
core archetype specs
ARD schema and metadata rules
derivation engine
generators
checks
runtime contracts
CLI commands
```

An authored app owns:

```text
concrete vocab declarations
concrete pattern applications
app-local pattern extensions
app-local archetype bindings
app-local ARDs
implementation leaves
tests
runtime config
hosting adapter config
```

The app consumes RTA, but it is not a passive generated project. It can extend the vocabulary locally and propose upstream changes.

### Scope Rules

RTA should classify every vocab/ARD/pattern/archetype item by scope:

```text
core
  shipped by RTA

app
  belongs to this app only

candidate
  app-local extension marked for possible upstreaming
```

Scope affects enforcement:

```text
core items
  must pass core RTA ARDs and golden fixtures

app items
  must pass app checks and cannot weaken inherited core obligations

candidate items
  must pass stricter docs/check/golden requirements before upstreaming
```

### Extension Loading

The derivation engine should load vocabulary in this order:

```text
1. core primitives
2. core patterns
3. core archetypes
4. app-local patterns
5. app-local archetypes
6. app vocab declarations
7. app bindings
8. app-local ARDs
```

Later layers may specialize and bind earlier layers. They may not mutate earlier layers.

### Runtime Capability Adapters

RTA should treat access to production systems as a runtime capability, not as a
hard-coded app leaf and not as a new T1 primitive.

The core vocabulary should ship reusable capability kinds:

```text
vault-secret-backend
file-secret-backend
in-memory-secret-backend
http-client
graphql-client
mcp-transport
hosting-adapter
```

An app may bind one of those kinds to a concrete endpoint, token path, file
path, workspace id, lab service, or local test double. The abstract capability
belongs upstream; the exact binding belongs to the app.

Example:

```yaml
runtimeCapabilities:
  - name: OperatorVault
    kind: vault-secret-backend
    configFields:
      - { name: mount, type: NonEmptyString }
    secretFields:
      - { name: token, type: SecretRef }
    appBindings: [local-demo, production-lab]
```

This lets RTA say "this app can bind a Vault-backed secret provider" without
saying "this app can talk to Virgil's production Vault." The latter is an app
configuration and policy decision.

### Governed Tool Surfaces

An RTA app can expose a governed tool surface for CLI commands, HTTP routes,
GraphQL operations, webhooks, MCP tools, or similar protocols.

A tool surface blooms from existing primitives:

```text
inbound-adapter
edge-boundary
policy
secret
outbound-adapter
operation receipt
```

Do not create a T1 `protocol-boundary` primitive unless those primitives cannot
express a real implementation. Protocol-specific shape belongs in T2/T3 vocab.

Core patterns should include:

```text
tool-surface
credential-broker
runtime-capability-adapter
projection-mount
external-schema-probe
```

Core archetypes should include:

```text
mcp-gateway
```

The `mcp-gateway` archetype is the RTA model for an AFFiNE MCP-style service:
declare tools, classify safety, resolve credentials, validate edge input,
invoke external services through outbound adapters, and return receipts.

Example:

```yaml
toolSurfaces:
  - name: AffineMcp
    service: affine
    protocol: mcp
    runtimeCapabilities: [OperatorVault, AffineGraphqlClient]
    policy: AffineToolPolicy
    tools:
      - name: affine.current_user
        safety: read
        credentialMode: user-required
        returns: CurrentUser
      - name: affine.doc_update
        safety: fail-closed
        credentialMode: user-required
        failClosedReason: AFFiNE write semantics are not verified in this app yet.
```

Governed tool-surface checks should fail when:

```text
a tool has no safety class
a tool has no credential mode
a fail-closed tool has no failClosedReason
a write/destructive/admin tool uses credentialMode: none
a tool surface references an undeclared runtime capability
```

### ARDs Across Core And App

ARDs should exist at both levels.

Core ARDs enforce the language and toolchain:

```text
T1 primitive correctness
T2 pattern structure
T3 archetype binding rules
generated-sync
derivation consistency
golden fixture behavior
```

App ARDs enforce the app's architecture:

```text
this app's contexts are documented
this app's connector writes pass review gates
this app's generated artifacts are synced
this app's local patterns are additive
this app's human-facing logs exist
this app's hosting adapter config validates if enabled
```

App ARDs may reference core spirit ARDs, but should not edit them.

Example:

```yaml
id: APP-ARD-MEETING-001
kind: letter
family: custom
name: Meeting publication requires review
spirit:
  - ARD-RUNTIME-REVIEW-000
checks:
  - description: publication commands are gated by approved review state
    command: pnpm rta check --review-gates --scope app
```

### Dependency Direction

The dependency direction should be:

```text
app -> RTA core
```

RTA core must not import meeting digest, AFFiNE-specific, Plane-specific, or home-lab-specific app code.

Adapters may depend on app config and core contracts:

```text
home-lab adapter -> app deployment intent + RTA hosting contract
Plane adapter -> app connector config + RTA review/publication contract
AFFiNE adapter -> app connector config + RTA publication contract
```

This allows apps to be concrete without making the core vocabulary parochial.

## ARD System

ARD means Architectural Requirement Definition.

ARDs should remain central. The old spirit/letter model is exactly right.

### Spirit And Letter

Spirit ARD:

```text
explains why a rule exists
lists the letter ARDs that enforce it
usually has no checks itself
```

Letter ARD:

```text
declares concrete checks
points back to an in-repo spirit ARD
fails if the mechanical enforcement fails
```

Example:

```yaml
id: ARD-T2-GUARD-001
kind: letter
family: t2
name: Guard pattern obligations are generated
spirit:
  - ARD-T2-000
severity: error
checks:
  - description: guard pattern contract is enforced
    command: pnpm rta check --pattern-contracts --pattern guard
```

### ARD Metadata Loop

`rta check --ard-meta` must enforce:

```text
duplicate ARD ids are illegal
letter ARDs must declare at least one check
spirit ARDs must declare at least one letter
letter ARDs may not declare letters
family ids must match their prefix
letter ARDs must reference at least one in-repo spirit ARD
spirit and letter references must be reciprocal
```

### CLI/Golden Fixture Loop

Golden fixtures should prove:

```text
required CLI commands exist
required check modes exist
required coverage kinds exist
known-good fixture passes
known-bad fixtures fail with expected messages
rta init creates the expected scaffold
rta generate emits obligation stubs
generated files are sync-checked
```

This protects the enforcement surface itself.

### ARD Families

Required families:

```text
ci/
  build, typecheck, tests, golden fixture viability

t1/
  primitive validity, metadata, implementation traceability, minimum obligations

t2/
  pattern structure, additive contracts, generated stubs

t3/
  archetype structure, binding completeness, derived test plan generation

use-cases/
  use-case validity, scenario coverage, inter-bounded-context coverage

extensions/
  local extension safety, upstreamable checks, promotion manifests

runtime/
  unit of work, scheduler, logging, review gates, connector behavior
  app CLI generation, runtime wiring, scenario/runtime parity

app-authoring/
  generated app shape, hosting-adapter readiness, agent docs, human review
```

Extension ARDs should include:

```text
ARD-EXT-000
  spirit: local extensions must be upstream-shaped

ARD-EXT-001
  local extension schema and ownership valid

ARD-EXT-002
  local extensions cannot weaken inherited obligations

ARD-EXT-003
  local extensions must have concrete app use

ARD-EXT-004
  upstream candidates must have app-independent fixtures

ARD-EXT-005
  upstream candidates must not depend on hosting/connectors/app names
```

Each letter ARD should point to a concrete check, for example:

```yaml
checks:
  - description: local extensions are safe for app use
    command: pnpm rta check --extensions-local
```

Use-case ARDs should include:

```text
ARD-USE-000
  spirit: production apps prove user/system goals with executable scenarios

ARD-USE-001
  every production app declares at least one use case

ARD-USE-002
  every use case has at least one executable scenario

ARD-USE-003
  scenario steps reference declared vocab

ARD-USE-004
  every bounded-context connection is scenario-covered

ARD-USE-005
  every external write path is covered by a review-gated integration scenario
```

Each letter ARD should point to concrete checks:

```yaml
checks:
  - description: use cases and scenarios are valid and covered
    command: pnpm rta check --use-cases --scenario-coverage --boundary-coverage
```

Runtime wiring ARDs should include:

```text
ARD-RUNTIME-WIRING-000
  spirit: app scenarios, local dev, generated CLI, and production use the same wiring

ARD-RUNTIME-WIRING-001
  every invokable command/flow/use case appears in the generated app CLI

ARD-RUNTIME-WIRING-002
  every production process is declared in AppRuntime

ARD-RUNTIME-WIRING-003
  every connector is wired through a port

ARD-RUNTIME-WIRING-004
  every scenario target uses the same runtime wiring with target-specific adapters

ARD-RUNTIME-WIRING-005
  production scenarios cannot perform external writes unless explicitly safe and review-gated
```

Each letter ARD should point to concrete checks:

```yaml
checks:
  - description: generated app CLI and runtime wiring are complete
    command: pnpm rta check --app-cli --runtime-wiring --scenario-runtime-parity
```

## Operation Event Logs

Logging is not incidental. Logs are how the operator watches the system.

Every primitive invocation should emit canonical structured operation events.
Leaf code should not invent ad hoc `console.log` calls for app behavior. Leaf
code should extend or compose an RTA primitive, and that primitive should speak
through the operation event stream.

The base primitive families should include at least:

```text
command-handler
query-handler
event-handler
rule
decision
reaction
process-manager
inbound-adapter
outbound-adapter
bounded-context
scheduler
job
projector
repository
edge-boundary
secret
policy
guardrail
```

Concrete app code should extend a specific primitive family and implement the
protected leaf hook. The public invocation method owns event emission.

Every emitted operation event should carry:

```text
machine-readable fields
human-readable summary
structured details
correlation/unit-of-work ids
derivation/provenance ids where relevant
verbosity-aware diagnostics
```

At normal verbosity, logs should be readable as compact operator prose:

```text
[normal] RULE-NO_DUP_IDS Rejected Obj.id because duplicate ids cannot be indexed
[normal] DIGEST_MEETING_HANDLER Started command Digest meeting-1 because the transcript is ready for topic and work-item extraction
```

At debug/trace verbosity, logs should show detailed context, stack-like diagnostic trails, decision inputs, derived obligation ids, connector targets, and review state.

Generated operation event contract requirements should come from vocab and derivation.

Example generated requirement:

```yaml
kind: OperationEventContract
for: TopicSegmentation.SegmentTranscript
required:
  - start summary
  - completion summary
  - decision summary for topic split/append
  - details include transcript span ids at debug+
  - provenance edge emitted
```

`rta check --operation-event` should fail if a required operation event contract is missing.

`rta check --primitive-boundaries` should fail when authored app source exports
behavior that does not extend an RTA primitive or use an approved RTA factory.
Generated files may be checked separately, but authored leaf behavior should
not be able to bypass primitive instrumentation silently.

`rta check --production` should aggregate the production gates:

```text
ARD metadata
generated sync
decision/rule implementation shape
obligation coverage
execution telemetry
operation event contracts
primitive boundaries
pattern specs and contracts
archetype specs and bindings
```

Scenario and demo runs should write:

```text
readable.log
operation-events.json
trace-summary.md
```

Those artifacts are QA evidence. A demo card should link to them or to a
larger proof-through-integration run that includes them.

## Review Gates

RTA must treat human review as a primitive.

External publication should not happen directly from extraction/enrichment. It should pass through a review gate.

Review gate vocab should declare:

```text
what is being reviewed
who/what may approve
what can be edited
what systems may receive approved output
what happens on reject
what audit/provenance is recorded
```

Meeting digest review gates:

```text
DigestReview
TopicReview
WorkItemReview
PublicationReview
```

RTA should support review surfaces:

```text
local review UI
Plane review column, later if desired
AFFiNE draft page, later if desired
```

Default stance:

```text
RTA manages inputs to outputs internally.
Only creates AFFiNE/Plane/GitHub outputs after review gates pass.
```

## Agent Experience

The agent should experience RTA as a CLI-backed contract.

Expected loop:

```bash
pnpm rta context
pnpm rta explain obligations
pnpm rta generate
pnpm rta check
```

Then:

```text
edit vocab when the domain model is wrong
edit src leaves when behavior is missing
edit tests to satisfy generated obligations
edit app UI for monitoring/review affordances
run checks again
```

Agents should not start by freehanding code.

Agents should start by asking:

```text
What vocab exists?
What tier/pattern/archetype applies?
What obligations did this create?
What generated files are expected?
What implementation leaves are intentionally open?
What checks prove completion?
```

Generated files should tell agents whether they are:

```text
always regenerated
generated once, then preserved
manual implementation leaf
```

## Documentation Plan

RTA documentation must be written for agents and humans who are actively building.

The docs should not be only explanatory essays. They should answer operational questions at the moment of work.

### Required Docs

`README.md`

```text
what RTA is
quickstart
main commands
where to start
```

`AGENTS.md`

```text
agent operating contract
first commands to run
where vocab lives
what generated files mean
what not to edit
how to satisfy obligations
how to run checks
how to prepare optional home-lab deploy
```

`docs/vision.md`

```text
philosophical heart
why RTA exists
why vocab matters
why Rita naming is retired
```

`docs/authoring-loop.md`

```text
full workflow from idea to app
agent loop
human review loop
common failure modes
```

`docs/vocabulary.md`

```text
vocab schema concepts
required metadata
examples
how to change app meaning
```

`docs/tiers.md`

```text
T1/T2/T3 model
progressive concretization
pattern/archetype examples
how obligations bloom through tiers
```

`docs/derivation-graph.md`

```text
what derivation is
how to inspect it
how to explain missing obligations
how generators/checks use it
```

`docs/ard-system.md`

```text
spirit/letter model
metadata loop
families
how to add an ARD
how to add enforcement
```

`docs/generator-contract.md`

```text
generated vs generated-once vs manual leaves
hashes
sync checks
safe regeneration rules
```

`docs/runtime-contract.md`

```text
unit of work
flow execution
scheduling
ports
connectors
side effects
```

`docs/operation-event-logs.md`

```text
what every log must carry
verbosity model
how to watch a run
how logs connect to provenance and obligations
```

`docs/review-gates.md`

```text
review primitive
approval flow
publication safety
where external tasks/docs get created
```

`docs/hosting-adapters.md`

```text
host-neutral deployment intent
local/container/home-lab adapter boundaries
how generated apps may become WorkloadApps
container expectations
route/auth/storage/secrets/backup for the home-lab adapter
promotion path into home-lab-v7 when that adapter is used
```

`docs/meeting-digest-seed.md`

```text
first app vocabulary
contexts
flows
review gates
connector assumptions
known limitations
```

`docs/salvage-plan.md`

```text
what was pulled from old rta-ddd-core
what was intentionally not pulled
what was rewritten around derivation
remaining parity gaps
```

### Generated Agent Docs

`rta init` should generate an app-local `AGENTS.md` that says:

```text
run rta context before editing
edit vocab first when meaning is wrong
run rta generate after vocab changes
do not hand-edit always-regenerated files
fill implementation leaves in src/
turn generated obligation TODOs into real tests
run rta check before claiming done
review gates block external publication
home-lab deploy is optional and goes through generated WorkloadApp intent
```

## Salvage Plan

Pull from old `rta-ddd-core` deliberately, not blindly.

### Pull Forward

```text
@rta/vocab schemas and parser
@rta/cli command shape
rta init/context/generate/check/lint/coverage/test-policy ideas
ARD spirit/letter model
ARD metadata validation
ARD runner/reporter structure
T1/T2/T3 ARD families
pattern specs
archetype specs
obligation generation
generated-sync checks
vocab linting for description/guidance
golden fixture manifest and drift checks
sample app loop checks
frontend vocab sandbox ideas
telemetry expectation scaffolding
```

### Rewrite Around Derivation

The old implementation has useful pieces, but the new production version should center on `packages/derivation`.

Old checks/generators independently discover parts of the world. New checks/generators should consume one normalized derivation graph.

Rewrite or refactor:

```text
obligation derivation
telemetry derivation
operation event contract derivation
review gate derivation
archetype-derived test plans
explain output
```

### Do Not Pull Blindly

Avoid carrying forward:

```text
unclear old Rita naming
placeholder ARDs as if production
visualizer experiments unless promoted through vocab/ui specs
sample-only paths that confuse framework/app boundaries
any Hermes assumptions
```

Hermes is explicitly out of scope.

## Proving App: Meeting Digest

The first serious proving app should be `examples/meeting-digest-seed`.

This app is not part of the RTA platform contract. It is a test, demonstration, and pressure source for the platform.

RTA should be built so this app can exist, but RTA should not contain meeting-specific assumptions in core packages.

Allowed locations for meeting-specific material:

```text
examples/meeting-digest-seed/
fixtures/meeting-digest/
docs/meeting-digest-seed.md
```

Not allowed in core packages:

```text
hard-coded transcript concepts
hard-coded Otter assumptions
hard-coded AFFiNE/Plane publication behavior
meeting-specific task types as primitives
meeting-specific review gates in runtime core
```

If the meeting app reveals a reusable shape, promote the reusable shape upward:

```text
meeting-specific behavior
  -> app vocab
  -> candidate pattern
  -> candidate archetype
  -> core RTA only after it proves general
```

Bounded contexts:

```text
MeetingIntake
TopicSegmentation
KnowledgeEnrichment
WorkExtraction
HumanReview
Publication
```

Key flows:

```text
IngestTranscript
SegmentTopics
AppendLoopbackEvidence
EnrichTopic
ExtractWorkItems
PrepareDigest
ReviewDigest
PublishApprovedOutputs
```

Key decisions:

```text
NewTopicOrExistingTopic
TopicReadyForWriteup
WorkItemType
NeedsHumanReview
PublishTarget
```

Work item classes:

```text
feature request
automation request
research task
integration task
cleanup/refactor task
documentation task
human decision needed
```

Connector assumptions:

```text
Otter: transcript source
AFFiNE: knowledge source and publish target
Plane: task/review surface or publish target
GitHub: issue/spec/PR target later
```

Publication rule:

```text
No external writes until HumanReview approves the artifact.
```

## Hosting Adapters

RTA-authored apps should be runnable without deployment.

Valid app modes:

```text
local dev app
CLI-only tool
library-style package
containerized service
home-lab WorkloadApp
future cloud deployment
```

Hosting is adapter-based. The core RTA platform should define deployment intent and generate adapter artifacts, but it should not require any specific host.

The home lab should be the first-class, native, obvious hosting adapter for Virgil's environment.

### Home-Lab Adapter

The home-lab adapter should deploy RTA-authored apps into the home lab as `WorkloadApp v1alpha1` apps.

Generated hosting surface:

```text
deploy/
  workload-app.yaml
  k8s/
    deployment.yaml
    service.yaml
    pvc.yaml
    httproute.yaml
  maintenance/
    backup.yaml
    restore.md
    healthcheck.yaml
```

Promotion path:

```text
generated deploy intent
  -> reviewed by human/agent
  -> promoted into home-lab-v7/deploy/apps/<app>/app.yaml
  -> validated by home-lab app integrity checks
  -> reconciled by GitOps/Argo
```

Meeting digest deployment shape:

```text
meeting-digest-api
  runs flows, stores provenance, exposes review API

meeting-digest-ui
  monitor, review queue, provenance graph

worker
  executes queued jobs and scheduled enrichments

storage
  first version: SQLite or libSQL on PVC
  later version: Postgres

object/PVC storage
  transcript snapshots
  rendered artifacts
  screenshots
  evidence bundles
```

Start simple:

```text
one container
one PVC
internal auth
manual connector secrets
human review UI
```

Then graduate:

```text
separate worker
Postgres
object storage
more robust queue
external publication adapters
```

Generated WorkloadApp intent should declare:

```text
container image
route intent
auth mode
persistent storage
Vault secrets
backup/restore behavior
health checks
maintenance notes
external write capabilities
human review gates
```

RTA should not bypass the home-lab platform. The home-lab adapter should produce artifacts that fit the existing app platform.

Core RTA should remain host-neutral:

```text
core RTA:
  app vocab
  generated code
  runtime contract
  checks
  deployment intent

home-lab adapter:
  WorkloadApp
  Argo/GitOps fit
  lab route/auth/storage/secrets/backup details
```

## Packaging And Distribution

Early development should use a monorepo and local packages.

```text
pnpm workspace
local packages
examples in repo
```

Generated apps may be created outside the RTA repo before publishing exists.
Until packages are published, `rta generate app` should write local `file:`
dependencies and pnpm overrides pointing to the checked-out RTA packages:

```text
@rta/cli     file:/path/to/rta/packages/cli
@rta/core    file:/path/to/rta/packages/core
@rta/runtime file:/path/to/rta/packages/runtime
@rta/strict  file:/path/to/rta/packages/strict
@rta/vocab   file:/path/to/rta/packages/vocab
```

This is a local-authoring bridge, not the upstream package contract. The
publishable story replaces those file links with versioned package
dependencies.

Later:

```text
@rta/cli
@rta/vocab
@rta/derivation
@rta/runtime
@rta/create-app
```

Developer commands:

```bash
pnpm rta check
pnpm dlx @rta/create-app meeting-digest
pnpm add -D @rta/cli
```

Do not optimize packaging before the authoring loop works.

## Implementation Phases

### Phase 0: Naming And Repo Reset

Goals:

```text
create/choose RTA repo
purge Rita naming from public docs/code paths
write vision and agent docs
import old salvage material into a branch
```

Deliverables:

```text
README.md
AGENTS.md
docs/vision.md
docs/salvage-plan.md
initial package layout
```

### Phase 1: Vocab, ARDs, CLI Skeleton

Goals:

```text
port vocab parser
add use-case and scenario schemas
port ARD schema/meta/runner
port init/context/check/lint basics
create golden fixture command inventory
```

Checks:

```text
pnpm test
pnpm rta check --ard-meta
golden fixture inventory passes
```

### Phase 2: Derivation Engine

Goals:

```text
centralize obligation derivation
centralize telemetry/log/review derivation
centralize use-case/scenario/boundary coverage derivation
produce derivation graph
implement rta explain
```

Checks:

```text
known vocab derives stable obligations
known use cases derive stable scenario and boundary obligations
explain output includes source chain
snapshot tests for derivation graph
```

### Phase 3: Generators And Checks

Goals:

```text
generate code scaffolds
generate obligation tests
generate telemetry tests
generate operation event contracts
generate review gates
generate use-case test stubs
generate scenario test stubs
generated-sync
obligation coverage
use-case coverage
scenario coverage
boundary coverage
operation event contract check
review gate check
```

Checks:

```text
known-good fixture passes
known-bad fixtures fail clearly
generated files include derivation hashes
```

### Phase 4: Runtime

Goals:

```text
unit of work
flow runner
scheduler and simulated time
operation lifecycle instrumentation runtime
review gate runtime
connector ports
```

Checks:

```text
local app can run a flow
logs are human-readable
trace verbosity exposes diagnostic trails
review gate blocks external write
```

### Phase 5: Generated App CLI And Runtime Wiring

Goals:

```text
define AppRuntime schema
generate app operational CLI
generate app wiring bootstrap
support memory/local/production scenario targets
validate connector ports and adapter bindings
validate scenario/runtime parity
```

Checks:

```text
generated app CLI exposes declared commands, flows, scenarios, review actions
generated app can install outside the RTA repo using local file-linked packages
generated app watch mode prints trace-level primitive operation logs
runtime wiring declares all production processes
scenario runner and production worker use the same wiring
connectors are wired through ports
production scenario external writes are blocked unless safe and review-gated
```

### Phase 6: Meeting Digest Seed

Goals:

```text
define meeting digest vocab
define meeting digest use cases and scenarios
generate app scaffold
generate meeting digest app CLI
define meeting digest runtime wiring
implement transcript/pasted-text intake
segment topics
extract work items
review queue
draft publication artifact
```

Checks:

```text
sample transcript becomes reviewable digest
declared cross-context connections are scenario-covered
generated app CLI can run the proving scenario locally
feature/automation/research tasks extracted
uncertainty is marked
no external publish without review
```

### Phase 7: Hosting Adapters

Goals:

```text
generate host-neutral deployment intent
generate home-lab WorkloadApp intent as first adapter
containerize app
optionally promote to home-lab-v7
validate app platform contract
optionally deploy behind lab route
backup/restore docs for adapter-managed state
```

Checks:

```text
host-neutral deployment intent validates
home-lab WorkloadApp integrity passes when adapter output is enabled
healthcheck passes
backup/restore story documented
review UI reachable
```

## Non-Goals

Not in the first production push:

```text
Hermes integration
fully autonomous external publication
enterprise Otter real-time access assumptions
complex distributed workflow engine
multi-tenant SaaS concerns
perfect generic frontend generator
separate RTA/Rita repos
```

## Chosen Defaults

These choices should be treated as the initial build plan unless implementation evidence forces a change.

1. App state starts with SQLite/libSQL on a local file or PVC for the proving app. Postgres becomes an adapter/runtime option when concurrency or operational needs justify it.
2. Plane is first a publication target, not the core review system. RTA owns the internal review queue. A Plane adapter may mirror approved or review-ready items.
3. AFFiNE drafts should be generated only after approval by default. Pre-review drafts may exist internally inside RTA, not as external AFFiNE writes.
4. First UI vocabulary primitives should be `ViewSpec`, `Panel`, `Affordance`, and `Projection`.
5. `rta dev` may warn on unfinished obligations. `rta check --production` must fail on uncovered obligations, missing use cases, missing scenario coverage, missing boundary coverage, unsafe connector writes, stale generation, missing review gates, and missing operation event contracts.
6. Generated files must be marked as `always-regenerated`, `generated-once`, or `manual-leaf`. Always-regenerated files are protected by generated-sync. Generated-once files are protected by provenance headers and drift warnings, not overwritten by default.
7. Waivers are allowed only as review artifacts with scope, reason, approver, and revisit condition.
8. Generated apps start with a single-process local runtime by default. The same AppRuntime contract may split into `api`, `worker`, and `scheduler` processes when a hosting adapter or production need requires it.

## Final Shape

RTA should be:

```text
vocab-authored
tier-derived
ARD-enforced
agent-friendly
human-reviewable
log-rich
hosting-adapter-ready
```

The meeting digest app is the seed, not the ceiling.

The long-term promise:

```text
We talk about a system.
RTA turns the talk into vocab.
The vocab derives obligations.
The CLI generates the app.
Agents fill the leaves.
Checks prove the shape.
Humans review the outputs.
An optional hosting adapter can run the result.
```
