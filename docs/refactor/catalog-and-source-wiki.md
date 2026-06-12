# Catalog And Source Wiki

The catalog should become a wiki-first explanation surface with source attached.
It should not feel like a raw list of YAML files.

## Primary Entry Points

The top-level catalog should have these entry points:

- Concepts,
- Apps,
- Flows,
- Steps,
- Edges,
- Rules and Decisions,
- Ports and Adapters,
- Scenarios and Evidence,
- Source Browser.

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

Concrete vocabulary items should show:

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

The source browser should support RTA-specific definition links where practical.

When source mentions an RTA concept such as a step, port, adapter, rule, or
decision, the catalog should be able to link that identifier to the concept
page.

This can start with simple deterministic identifier matching and improve later.

## Tree Browsing

The left side should support multiple browsing modes:

- by concept kind,
- by app,
- by bounded context,
- by flow,
- by source tree,
- by tier,
- by evidence/scenario.

Source tree browsing is advanced mode. Concept browsing is the default.

## Apps Executing

Eventually the catalog should distinguish:

- apps declared in repo,
- apps with generated source,
- apps with passing checks,
- apps with scenario evidence,
- apps currently executing,
- apps deployed elsewhere.

Runtime state should not be faked from declarations.

## API Shape

The catalog API should expose clean, stable resources:

```text
GET /api/v1/catalog
GET /api/v1/concepts
GET /api/v1/concepts/:id
GET /api/v1/apps
GET /api/v1/apps/:id
GET /api/v1/flows/:id
GET /api/v1/steps/:id
GET /api/v1/source?path=...
GET /api/v1/source-links?path=...
GET /api/v1/evidence?app=...
```

The UI should use these APIs rather than reconstructing meaning from raw files.

