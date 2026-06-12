# Catalog And Source Wiki

This file has a legacy title. The intended model is now split:

- **Concept wiki**: stable explanatory articles for durable RTA ideas.
- **Generated app workbench**: source, declarations, ARDs, generated files,
  wiring, tests, runtime evidence, command streams, diffs, probes, and traces
  for one generated app workspace.
- **Legacy catalog**: current exploratory code/UI/API that may be mined, moved
  to `/junkyard`, renamed, or deleted during Phase 0B.

Do not treat the old catalog as the final product surface.

The concept wiki should help a reader get their head around RTA. It should not
feel like a raw list of YAML files, ARDs, source files, or app inventory.

## Primary Entry Points

The concept wiki should have entry points for stable architectural ideas:

- Flows,
- Steps,
- External boundaries and translators,
- Rules and Decisions,
- Ports and Adapters,
- Scenarios and Evidence.

The generated app workbench, not the concept wiki, should expose:

- app-local definitions,
- candidate-upstream concepts,
- source browser,
- declaration browser,
- ARDs,
- wiring graph,
- generated files,
- tests,
- live/runtime evidence,
- probe and trace views.

## Concept Pages

Concept pages explain reusable RTA language.

Example shape:

```md
# Rule

## Description

A rule is an invariant or check. At T1, a rule is a skeleton for producing a
typed result with reasons. At app-local tiers, a rule carries domain meaning and
inherits test obligations from its upstream primitive or pattern.

## Contract

- input type,
- result type,
- reason codes,
- evidence emitted,
- test obligations.

## Source

Inline source excerpt or generated skeleton.

## Related

- Decision,
- Step,
- Evidence,
- Tier.
```

## Concrete Item Pages

Concrete vocabulary items in a generated app workbench should show:

- name,
- kind,
- tier,
- scope,
- description,
- source file,
- declaration file,
- generated artifacts,
- tests,
- parents,
- children,
- runtime evidence,
- scenario coverage.

## Map Versus Territory

Declarations and source should both be visible.

The UI should label them clearly:

- **Declaration**: ARD/YAML/JSON/spec that describes intent.
- **Source**: TypeScript that actually runs or is imported.
- **Generated**: code derived from declarations.
- **Evidence**: runtime/test proof.

This prevents confusing the map for the territory.

## Source Links

The generated app workbench source browser should support RTA-specific
definition links where practical.

When source mentions an RTA concept such as a step, port, adapter, rule, or
decision, the workbench should be able to link that identifier to the concept
page or the concrete declaration/source item.

This can start with simple deterministic identifier matching and improve later.

## Tree Browsing

The generated app workbench should support multiple browsing modes:

- by concept kind,
- by app,
- by bounded context,
- by flow,
- by source tree,
- by tier,
- by evidence/scenario.

Source tree browsing is advanced mode. Concept browsing is the default for the
wiki, while app structure and wiring are the default for the workbench.

## Apps Executing

Eventually the generated app workbench should distinguish:

- the app declared in this generated workspace,
- generated source for that app,
- passing checks for that app,
- scenario evidence for that app,
- whether that app is currently executing locally,
- whether that app is deployed elsewhere.

Runtime state should not be faked from declarations.

## API Shape

The future generated app workbench API should expose clean, stable resources:

```text
GET /api/v1/concepts
GET /api/v1/concepts/:id
GET /api/v1/app
GET /api/v1/flows/:id
GET /api/v1/steps/:id
GET /api/v1/source?path=...
GET /api/v1/source-links?path=...
GET /api/v1/evidence?app=...
```

The UI should use model APIs rather than reconstructing meaning from raw files.
