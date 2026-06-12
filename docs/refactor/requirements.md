# Requirements

## 1. Framework Identity

RTA should become a TypeScript + Effect framework for building observable
DDD/hex-style applications.

The framework should guide both humans and agents through:

1. declaring app structure,
2. generating boring/scaffolded code,
3. implementing domain-specific leaves,
4. running flows and scenarios,
5. inspecting evidence,
6. promoting stable local vocabulary upstream.

RTA is not a generic IDE, a generic file browser, or a YAML-first runtime. Source
code remains the territory. Declarations are the map. Evidence proves whether
the map and territory are still aligned.

## 2. Required App Shape

An RTA app should be able to declare and generate at least:

- app metadata,
- bounded contexts,
- external surfaces,
- inbound surface translators / defensive boundaries,
- flows,
- steps,
- rules,
- decisions,
- ports,
- adapters,
- repositories,
- scenarios,
- tests,
- evidence expectations.

The framework should not require every app to use every concept on day one, but
it should make omissions explicit. For example, a tiny app may have one external
surface, one translator into trusted input, one flow, one step, one in-memory
adapter, and one scenario.

## 3. Generated-Code Discipline

Structural files should be created through the CLI unless there is a deliberate
escape hatch.

Required behavior:

- generated files include provenance metadata,
- declarations and generated files are cross-checked,
- stale generated output fails checks,
- orphaned structural source files fail checks,
- hand-authored leaves are clearly marked,
- generated files are safe to overwrite,
- hand-authored files are not silently overwritten.

The CLI should make the correct path easier than manual invention.

## 4. External Boundaries Defend

Every untrusted input must pass through an explicit defensive boundary before it
reaches a step. The term `edge` is currently legacy/provisional; the durable
concept is the boundary that sanitizes and translates raw input into trusted
domain/application data.

Each external boundary must declare:

- protocol or entry mechanism,
- trust level,
- actor/auth expectations,
- input schema,
- output trusted type,
- threat model,
- sanitizers,
- rejection behavior,
- evidence emitted,
- tests covering declared threats.

No raw external payload should reach a step.

The output of this layer should be typed trusted input: aggregates, commands,
value objects, actor context, or other explicit application inputs. Steps
operate inside that sanitized bounded context.

## 5. Steps Decide And Act

Steps are the main operational unit.

Each step must:

- receive trusted input,
- perform one meaningful unit of work,
- call ports rather than concrete adapters,
- run rules/decisions where needed,
- emit typed outcomes,
- emit evidence for receipt, interpretation, decisions, actions, emitted
  outcomes, and failures.

Steps may be heavier than strictly necessary when that improves auditability,
debuggability, or human comprehension.

Steps must not talk to adapters. If a step needs I/O, it calls a port/capability;
the adapter is selected by composition/wiring outside the step.

## 6. Flows And Sagas Connect Steps

Internal step-to-step wiring should be flow topology, not direct function calls.

Flows must:

- route typed step outcomes,
- show branch conditions,
- show retries and compensations,
- support long-running saga/process-manager shapes,
- emit flow-level evidence.

Open question: ordinary in-flight I/O waits may just be step/port behavior, while
waiting across time, external events, retries, or compensation is likely saga /
process-manager territory. The refactor should make that distinction explicit.

## 7. Ports And Adapters

Ports are capability contracts. Adapters fulfill them.

Requirements:

- steps depend on ports,
- adapters implement ports,
- port calls are typed and evidence-wrapped,
- adapter failures are typed,
- tests can swap adapters for fake or in-memory implementations,
- port metadata appears in the catalog.

Adapters should be used only when crossing into concrete dependencies such as
databases, external APIs, filesystems, queues, clocks, identity providers,
secret stores, AI providers, browsers, or app APIs.

Internal steps should not be connected through adapters.

## 8. Rules And Decisions

Rules and decisions explain why.

Requirements:

- rules model invariants/checks,
- decisions model branch/classification logic,
- reusable primitive rules may live upstream,
- domain-specific rule declarations live where their meaning lives,
- each rule/decision exposes reason codes or explanation payloads,
- tests cover rule and decision outcomes,
- catalog pages show the source and inherited/specialized relationship.

## 9. Tier System

The tier system should become a real contract.

Requirements:

- T1 defines durable primitives and skeletons,
- T2 defines reusable specializations of T1 items,
- T3 is optional and only defines more concrete reusable specializations of T2 items when that extra rung reduces repetition or clarifies obligations,
- app-local vocabulary lives close to the app until promoted,
- higher-tier or app-local leaves inherit test obligations from upstream,
- checks prevent untracked vocabulary drift.

Tier relationships are `is-a` relationships. Reusable app shapes that compose many
tiered items are blueprints, recipes, templates, or skeletons, not T3 vocabulary merely
because they are larger.

T1 and T2 are the required foundation. T3 should not be created by default.
Most app-specific language should stay app-local until it recurs, stabilizes,
and proves that a reusable T3 specialization would make checks, generation, or
human explanation better.

## 10. Catalog / Wiki

This heading is intentionally being split.

The old `catalog` idea is deprecated as a fused all-purpose surface. Most active
source/declaration/runtime discovery should move through the generated app
workspace workbench / server.

The wiki is exactly a wiki: stable mental-model documentation that ships with
RTA and helps humans and agents understand concepts before reading source.

Required wiki entry points:

- Concepts,
- Bounded contexts / hexagons,
- Steps,
- Flows and sagas,
- Ports and adapters,
- Rules and decisions,
- Evidence,
- Tiers,
- Candidate upstream.

The generated app workbench should provide source, declaration, tests, generated
artifacts, parents/children, runtime evidence, and graph/source browsing. It may
link to wiki pages, but it should not be called the wiki.

## 11. Native Testing

Testing should be easy to run and natural to write.

Required layers:

- unit tests for values, rules, decisions,
- step tests with fake ports,
- flow tests with in-memory adapters,
- integration tests at real adapter boundaries,
- scenario tests for human-observable behavior,
- smoke tests for deployed/runtime behavior.

## 12. Evidence And Logging

Evidence must be emitted at more than just steps.

Required evidence levels:

- external boundary / translator,
- flow,
- step,
- rule/decision,
- port call,
- adapter,
- repository,
- scenario.

The evidence model should answer:

- what came in,
- what it meant,
- what was decided,
- why,
- what dependency was called,
- what changed,
- what was emitted,
- what failed.

## 13. Cleanup Boundary

The refactor should not simply add new terms over old terms.

Required cleanup:

- identify current concepts to keep,
- identify experimental concepts to move to `/junkyard`,
- identify old apps/examples to move to `/junkyard` or delete,
- migrate old declarations intentionally,
- keep compatibility notes for renamed concepts.
