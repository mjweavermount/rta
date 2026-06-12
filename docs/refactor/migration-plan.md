# Migration Plan

The refactor should be structural, not another layer.

## Phase 0: Freeze The Target Language

Deliverables:

- this refactor packet,
- vocabulary table,
- old-to-new concept map,
- explicit non-goals.

Exit criteria:

- edges, steps, flows, ports, adapters, rules, decisions, evidence, and tiers
  have stable enough definitions for implementation.

## Phase 1: Inventory And Junkyard

Inventory current repo surfaces:

- `packages/core`,
- `packages/runtime`,
- `packages/strict`,
- `packages/scenario`,
- `packages/vocab`,
- `packages/cli`,
- `ards/`,
- `fixtures/`,
- `examples/`,
- generated output.

Classify each as:

- keep,
- rename,
- split,
- move to `/junkyard`,
- delete.

Exit criteria:

- no major package or example is ambiguous.
- every questionable legacy surface is either intentionally kept or clearly
  marked as junkyard material.

## Phase 2: Schema First

Create or revise schemas for:

- app,
- bounded context,
- edge,
- flow,
- step,
- rule,
- decision,
- port,
- adapter,
- scenario,
- evidence expectation,
- tier obligation.

Exit criteria:

- schemas can parse a small seed app declaration.
- invalid examples fail for useful reasons.

## Phase 3: Generator Discipline

Update generators so structural additions pass through the CLI.

Add commands in this direction:

```sh
rta add app
rta add context
rta add edge
rta add flow
rta add step
rta add port
rta add adapter
rta add rule
rta add decision
rta add scenario
```

Exit criteria:

- generated files include provenance,
- generated sync checks fail on stale output,
- hand-authored leaves are preserved.

## Phase 4: Runtime Wrappers

Implement evidence wrappers around:

- edges,
- flows,
- steps,
- rules/decisions,
- ports,
- adapters,
- repositories.

Exit criteria:

- a seed app emits readable evidence across the full path.

## Phase 5: Native Tests

Add first-class test commands for:

- rules,
- decisions,
- steps,
- flows,
- scenarios,
- integrations,
- smoke paths.

Exit criteria:

- the seed app proves each layer with one small example.

## Phase 6: Catalog Rebuild

Rebuild the catalog around concept pages and source attachments.

Exit criteria:

- concept pages are useful without opening source,
- source remains one click away,
- declarations/source/generated/evidence are clearly separate,
- duplicate fixture noise is excluded from semantic views.

## Phase 7: App Migration

Migrate one real app first.

Candidate: the smallest useful app that exercises:

- one external edge,
- one flow,
- two steps,
- one rule,
- one decision,
- one driven port,
- one adapter,
- one scenario,
- one evidence review packet.

Exit criteria:

- old and new paths are compared,
- old path can be removed or moved to `/junkyard`.

## Phase 8: Cleanup

Remove old workbench-era pieces that no longer fit or move them to `/junkyard`.

Exit criteria:

- `pnpm check` passes,
- catalog shows the new structure,
- docs point to the new model,
- old docs are either updated, moved to `/junkyard`, or explicitly marked stale.

## Structural Principle

Do not migrate everything at once. Build one clean vertical slice, then use that
slice as the standard for the rest of the repo.
