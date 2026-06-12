# Structural Refactor Strategy

This document explains how to do the refactor in code without destabilizing the
whole repo at once.

## Current Package Reading

The current repo already has pieces that can be reused:

- `packages/core`: domain primitives such as aggregate, command, decision,
  event, operation scope, repository, rule, and edge boundary.
- `packages/runtime`: runtime implementations for edge boundaries,
  repositories, queues, secrets, and SQL boundaries.
- `packages/strict`: branded primitives, lifecycle, connection maps, readable
  logs, correlation, and OTEL-related helpers.
- `packages/scenario`: capture and reporting.
- `packages/vocab`: vocabulary parsing.
- `packages/cli`: checks, generation, catalog, server control, and operator
  commands.

The refactor should reuse these where they match the target model and rename,
move to `/junkyard`, or delete them where they do not.

## New Spine

The new implementation spine should be:

```text
packages/vocab
  schemas and parsed declarations

packages/core
  pure domain and operation contracts

packages/runtime
  Effect runtime wrappers and evidence emission

packages/scenario
  scenario execution and review packets

packages/cli
  declaration/generation/check/test/catalog doorway

packages/catalog (future optional)
  catalog API and UI if CLI becomes too large
```

`packages/strict` should either become a low-level support package with a clear
name or be folded into `core`/`runtime` where concepts now belong.

## First Vertical Slice

Build one seed app that proves the target shape.

It should include:

- one HTTP or CLI edge,
- one flow,
- two steps,
- one rule,
- one decision,
- one port,
- one in-memory adapter,
- one scenario,
- generated source,
- evidence output,
- catalog pages.

This seed app becomes the acceptance fixture for the refactor.

## Avoid Big Bang Renames

Do not rename every current package first.

Instead:

1. introduce new schema names,
2. generate new files under a clearly marked seed app,
3. adapt runtime wrappers,
4. prove tests and evidence,
5. migrate older examples one at a time,
6. then delete old names or move them to `/junkyard`.

## Checks Before Runtime

Before runtime behavior changes, add checks that can identify drift:

- missing declaration for structural source,
- missing generated provenance,
- missing test obligations,
- missing edge threat-model coverage,
- step depending on adapter directly,
- flow topology bypassed by direct step calls,
- undeclared vocabulary item.

These checks should fail clearly and early.

## Catalog As Refactor Pressure

The catalog should drive cleanup by making confusing structure visible.

When the catalog cannot explain a thing, that is either:

- missing metadata,
- bad vocabulary,
- stale source,
- or a concept that should be removed.

## Compatibility Strategy

Some old terms can remain as aliases temporarily:

- boundary -> edge or boundary schema, depending on use,
- operation -> flow or step, depending on granularity,
- workbench -> CLI/catalog operator surface,
- wiring -> flow topology or adapter binding, depending on use,
- source-workbench -> source browser/catalog.

Aliases should have deprecation notes and should not be allowed in new
generated code once the new spine exists.

## Implementation Order

Recommended code order:

1. add schema/declaration types,
2. add seed app declarations,
3. add generators for the seed app,
4. add generated provenance checks,
5. add runtime wrappers for edge/step/port evidence,
6. add native tests for the seed app,
7. rebuild catalog API around the new concept model,
8. migrate one existing example,
9. move stale examples to `/junkyard` or delete them,
10. tighten checks.
