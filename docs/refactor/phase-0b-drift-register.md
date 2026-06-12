# Phase 0B Drift Register

Phase 0B is the continuous convergence lane. It keeps known weirdness visible
while the refactor proceeds, without pretending every old surface must be fixed
immediately.

## Active Drift

### Legacy catalog surface

Current CLI/server code still exposes catalog-style APIs and pages. The target
model splits stable concept wiki from generated app workbench/source discovery.

Disposition: keep only as exploratory scaffolding until the generated app
workbench exists, then rename, move to `/junkyard`, or delete.

### Edge naming

Current source and generated data still use `Edge` / `EdgeBoundary`. The target
model is external boundary/translator defense before internal steps receive
trusted inputs.

Disposition: audit every occurrence. Keep only if the refactor gives `Edge` a
precise meaning distinct from boundary/translator.

### BoundedContext over-parenting

Current generated/catalog views can make many unrelated concepts look like
children of `BoundedContext`. The target model treats bounded context as close
to a hexagon, not as the universal parent for all vocab.

Disposition: split first-class vocabulary for boundary, step, flow, port,
adapter, rule, decision, evidence, scenario, and tier obligations.

### Demo and fixture sprawl

The repo contains examples, fixtures, work folders, and generated outputs from
several older experiments.

Disposition: classify as keep, rewrite, move to `/junkyard`, or delete before
depending on any of it as doctrine.

### Local bootstrap leakage

References to private local bootstrap paths such as Hermes/heckitonkires should
not be required for normal RTA development.

Disposition: replace with repo-owned setup or documented package scripts. Keep
machine-local workarounds out of user-facing instructions.

## Rule

When touching a confusing area, pay the Phase 0B tax:

1. Name the old assumption.
2. Decide whether it is keep, rename, junkyard, delete, or temporary
   compatibility.
3. Update docs/checks/tests in the same slice when practical.
4. Leave a human QA step if the change affects workflow or product meaning.
