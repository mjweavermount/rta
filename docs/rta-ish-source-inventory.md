# RTA-ish Source Inventory

Date: 2026-06-05

Status: reset inventory for the next RTA build

## Purpose

This document records every RTA/Rita-ish source found in the local environment
and what the next RTA implementation should take from each one.

The current `/Users/virgil/Developer/rta` implementation is not the production
foundation. Treat it as prototype evidence and discard its runtime shape.

## Decision

Start over around the older TypeScript/CQRS RTA spine, not around the current
`.mjs` prototype.

The production RTA repo should be TypeScript-first, CQRS-first, vocab-first,
and built around abstract base classes or equivalent template-method classes
that enforce operation lifecycle instrumentation at the primitive boundary.

## Source Map

| Source | Classification | Take Literally | Take Inspirationally | Discard / Do Not Copy |
| --- | --- | --- | --- | --- |
| `/Users/virgil/Developer/Virgil-Info/home-lab-v7/vendor/rta-ddd-core` | Primary upstream seed | TypeScript package layout, `@rta/vocab`, `@rta/core`, `@rta/strict`, `@rta/scenario`, `@rta/cli`, Effect Schema validation, TypeId separation, strict CQRS, command/query/event/handler primitives, connection maps, ARD metadata, generated obligations, golden fixture loop, execution telemetry projections | Boundary-first modular monolith posture, vocab as canonical source of truth, "story becomes fact" rule, fixture-driven framework development | Any stale path names, incomplete telemetry wrappers, "lifecycle" wording where it means execution telemetry |
| `/Users/virgil/Developer/rta` | Prototype/archive | Human-facing requirements captured in docs, demo expectation that every capability must be tied to an experiential proof, work-ledger idea, optional home-lab hosting adapter idea, meeting digest as proving app | The observed CLI verbs and local-run ergonomics can inform the future CLI surface | `.mjs` implementation, broad hand-built runtime, overclaimed QA state, generated artifacts under `.rta/`, current meeting digest implementation as framework proof, any formal-review Plane state from this run |
| `/Users/virgil/Developer/rta/.rta` | Runtime byproduct | Nothing as production architecture | Existing run/review/published artifacts show what an operator might want to inspect after a run | Generated JSON/files as source of truth; they came from the rejected prototype |
| `/Users/virgil/Developer/rta/examples/meeting-digest-seed` | Prototype proving app | Domain examples for transcript ingestion, topic extraction, review-gated publishing, and dry-run external writes | Useful acceptance scenarios for the future TypeScript meeting digest app | Runtime shape, `.mjs` CLI, direct coupling to rejected framework code |
| `/Users/virgil/Developer/rta/examples/hello-rta` and `examples/flow-minimal` | Prototype examples | Maybe simple fixture names and expected developer ergonomics | Very small smoke-test examples are still valuable for future generator QA | Implementation details |
| `/Users/virgil/Developer/Virgil-Info/home-lab-v7/tmp/rta-workload-root` | Temporary generated output | Nothing | May show the desired home-lab adapter output shape if source docs are missing | Treat as disposable tmp output |
| `/Users/virgil/Developer/Virgil-Info/home-lab-v7/web/node_modules/@rta` | Installed package area | Nothing unless source package is missing | Can confirm package names/exports if necessary | Do not edit or treat as source |
| `/Users/virgil/Library/Mobile Documents/com~apple~CloudDocs/obsidian/rita-era` | Conceptual/inspirational source | Grammar/vocabulary distinction, tiered specificity, archetype language, the idea that canonical grammar lets authored/procedural/AI-generated instances stay tractable | "The canon is the grammar; specific instances are the vocabulary", T1/T2/T3 style from broad requirements to specific subsystems/north stars, archetypes as reusable functional organs | Rita naming, game-specific domain content as RTA framework content |
| `/Users/virgil/Documents/Codex/2026-06-04/otter-ai-plugin-otter-ai-openai/work/rita-app-framework` | Mentioned local salvage candidate, not found in the active local repo inventory during this pass | Re-check if present in a later workspace snapshot | Possible older scaffold language around generators/vocab/tiers | Do not block the reset on it |
| `SiderealMollusk/rita-app-framework` | Governed execution framework source | OperationScope, PolicyToken, Reason, CapabilityBag, TrustLevel promotion, StrictUseCase, StrictEntity, StrictRepository, StrictUnitOfWork, deterministic clock/random, ForbiddenScan, BoundaryCheck, strict hexagonal architecture docs | "Governed execution" posture, attribution for every state change, operation scopes as the active authority/context boundary, architectural enforcement playbook | Rita/rtata naming, Zod as mandatory if Effect Schema is the new standard, any architecture that conflicts with strict CQRS in `rta-ddd-core` |
| Home-lab app platform docs in `/Users/virgil/Developer/Virgil-Info/home-lab-v7/docs/platform` | Adapter inspiration | WorkloadApp adapter expectations only when building optional home-lab deployment | Optional hosting path, edge route/GitOps packaging, lab operator language | Home-lab deployment as a hard requirement for every RTA app |
| Codex memory and prior chat artifacts | Context only | User decisions: RTA name, no Hermes, TypeScript preference, CQRS importance, optional lab adapter, Plane not source of truth | Tone and acceptance lessons | Treating old assistant claims as verified implementation facts |

## What To Pull Forward Literally From `rta-ddd-core`

The next implementation should begin by importing or porting these concepts
before rebuilding meeting digest:

- TypeScript monorepo packages: `vocab`, `core`, `strict`, `scenario`, `cli`.
- Effect Schema input/output validation at command/query/event boundaries.
- Strict CQRS:
  - commands return `void`
  - command results are observed through domain events
  - queries are read-side only and must not mutate write models
  - command handlers, query handlers, and event handlers are distinct typed contracts
- TypeIds or equivalent branded types so handlers cannot accidentally accept the
  wrong message family.
- Vocab as the declarative source of truth for contexts, aggregates, commands,
  events, queries, read models, services, connection maps, policies, rules,
  decisions, reactions, process managers, and review gates.
- ARDs as typed policy objects, not loose prose.
- Obligation derivation that produces deterministic test/check obligations.
- Generated-sync enforcement for CLI-owned artifacts.
- Golden fixture and sample-app loop for every framework claim.
- Canonical execution telemetry events, with readable logs, OTEL, scenario
  capture, and visualizer output as projections of the same event stream.
- Correlation, causation, message, run, review, and provenance IDs as first-class
  runtime facts.

## What To Pull Forward From The Rejected Prototype

The prototype should still influence the reset in these narrower ways:

- The operator wants to watch human-readable logs in a terminal.
- Every meaningful capability must be tied to a demo, directly or through a
  later integration demo that exercises it.
- Plane/GitHub/AFFiNE should be optional publication or mirror adapters, not
  required internal state.
- Review is QA/demo acceptance, not "developer reads source before approving".
- External writes must be dry-run by default until a review gate and connector
  policy allow them.
- Work/features/capabilities need an internal ledger that can export to Plane
  or GitHub without depending on either.
- The meeting digest app is the proving target, not part of RTA core.

## What To Pull From `SiderealMollusk/rita-app-framework`

The GitHub repo should influence the reset in a concrete way. It contains the
governed-execution side of the system that the prototype lacked:

- `OperationScope` as the central active operation container.
- Context promotion from external to internal to command to system.
- Capability tokens for authority, especially `PolicyToken`, `CommitCap`, and
  admin/raw-query capabilities.
- Mandatory `Reason` strings for state evolution.
- Strict base classes for use cases, entities, repositories, and unit of work.
- Boundary checks and forbidden API scans for architectural enforcement.
- Deterministic `ClockPort`, simulated clock, and simulated random for time and
  randomness control.
- Trace/log context that travels with the operation scope.

This source should not replace `rta-ddd-core`. It fills a different part of the
picture:

- `rta-ddd-core` supplies vocab, CQRS, ARDs, generated obligations, and fixture
  loops.
- `rita-app-framework` supplies governed execution, authority tokens,
  immutable evolution, operation scope, trust promotion, and architectural
  enforcement patterns.

The reset should merge those ideas into one RTA vocabulary:

```text
Command/Query/Event from rta-ddd-core
  execute inside OperationScope
  require TrustLevel and CapabilityBag where writes are possible
  emit structured operation events
  stage events/writes through UnitOfWork
  prove boundaries through generated checks and golden fixtures
```

## What To Pull From `rita-era`

Use the vault as language and design inspiration, especially:

- Grammar vs vocabulary:
  - grammar defines the required shape
  - vocabulary supplies concrete app-specific instances
- Tiers:
  - Tier 1: foundational primitives and core mechanical contracts
  - Tier 2: reusable patterns that compose primitives for common cases
  - Tier 3: archetypes or north-star structures that are reusable but more
    concrete than patterns
- Archetypes:
  - reusable functional organs that may appear in multiple apps
  - not abstract primitives and not one-off local leaves
- Blooming from tier to tier:
  - broad requirements become specific contracts
  - specific app instances must satisfy the inherited grammar
  - local vocabulary can propose upstream candidates when it proves general

Do not copy game-specific mechanics into RTA.

## Reset Implementation Direction

The new RTA core should use TypeScript abstract classes or an equivalent
template-method pattern:

- A primitive base class owns the public `execute`/`handle` lifecycle method.
- The public lifecycle method emits required operation events before and after
  protected hooks.
- Descendants implement protected hooks such as `validateInput`,
  `decide`, `mutate`, `emit`, `project`, or `summarizeResult`.
- Descendants may customize summaries, redaction, and domain-specific detail.
- Descendants may not bypass required operation lifecycle instrumentation.
- Sensible default summaries should say what happened and why, so ordinary app
  code does not reimplement boilerplate logging.

This is the programming pattern the reset must prove before rebuilding meeting
digest.

## Plane Reset Note

The prior Plane/card state should not be treated as a formal review queue for
this prototype. Plane is optional working memory, not the source of truth.

In this thread, no Plane connector is exposed. The local home-lab
`operator-plane.sh` helper exposes list/show/move/comment, not a board-wipe
operation. Do not raw-delete Plane database rows to satisfy "wipe the board".
Instead, once Plane access is intentionally available, comment/move old RTA
cards as superseded by this reset or create a fresh project/label for the new
RTA effort.

## Next Repo Shape

The reset repo should be rebuilt around:

```text
rta/
  packages/
    vocab/
    core/
    strict/
    scenario/
    cli/
    app-authoring/
    app-runtime/
    adapters/
  fixtures/
    golden-pass/
    golden-fail/
    sample-app/
    meeting-digest/
  docs/
    rta-production-authoring-platform-spec.md
    rta-ish-source-inventory.md
    vocabulary.md
    cqrs.md
    operation-lifecycle-instrumentation.md
    ard-system.md
    generator-contract.md
    agent-playbook.md
```

Meeting digest should be rebuilt only after the framework can prove:

- strict CQRS contracts
- abstract/template primitive instrumentation
- vocab-to-generated-code flow
- obligation/test derivation
- readable log projection
- scenario capture
- review-gated connector safety
- app-local extension plus upstream-candidate flow
