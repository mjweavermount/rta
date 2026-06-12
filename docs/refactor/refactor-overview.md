# Refactor Overview

This is the focused snapshot of the refactor target.

## Goals

1. TypeScript + Effect as the runtime spine.
2. DDD/hex architecture as boundary discipline.
3. Source code is territory; declarations are map.
4. CLI-first structural authoring.
5. Generated files have provenance.
6. Hand-authored leaves are protected.
7. External boundaries/translators defend all untrusted input before steps receive trusted inputs.
8. Steps decide and act.
9. Flows/sagas connect steps.
10. Ports declare capabilities.
11. Adapters fulfill ports.
12. Rules model invariants.
13. Decisions explain branches and classification.
14. Evidence/logging at edge, flow, step, rule, decision, port, adapter, repository, and scenario.
15. T1 and T2 are the core tier system.
16. T3 is optional and must prove it is not just a blueprint or app-local leaf.
17. Blueprints compose tiered vocabulary; they are not tiers.
18. Branded/generated structure makes unsupported invention hard.
19. Native tests at unit, step, flow, integration, scenario, and smoke layers.
20. The concept wiki explains stable RTA concepts; generated app workbenches explain source, tests, ARDs, generated files, and evidence for one app workspace.
21. Old concepts are kept, renamed, moved to `/junkyard`, or deleted deliberately.
22. The RTA core repo builds the CLI, server, templates, and app-authoring
    machinery.
23. `rta init my-app` creates one app directory/repo/server/workbench, not an
    entry in a many-app core catalog.
24. Hermes/heckitonkires path assumptions are local bootstrap scaffolding and
    should be destroyed as a dependency of normal RTA development.

## Process

1. Freeze target language.
2. Inventory current repo.
3. Classify each package, example, ARD, and fixture as keep, rename, split, move to `/junkyard`, or delete.
4. Build schemas first.
5. Create one clean seed app.
6. Generate its structural files through the CLI.
7. Add provenance and generated-sync checks.
8. Add runtime evidence wrappers.
9. Add native tests for the seed app.
10. Split the stable concept wiki from the generated app workbench/source explorer.
11. Migrate one real app.
12. Compare old and new paths.
13. Remove old paths or move them to `/junkyard`.
14. Tighten checks.
15. Repeat app by app.

## Final Repo Shape

```text
packages/vocab
  schemas
  parsed declarations
  tier contracts

packages/core
  pure domain contracts
  external boundaries / translators
  flows
  steps
  ports
  rules
  decisions
  outcomes

packages/runtime
  Effect runtimes
  evidence emitters
  adapter wrappers
  repository wrappers

packages/scenario
  scenario execution
  fixtures
  review packets
  evidence captures

packages/cli
  rta add ...
  rta init my-app
  rta generate
  rta check
  rta test

packages/workbench-template
  generated app workbench template
  source renderer
  command/evidence views

packages/wiki
  stable concept articles shipped with RTA
  not an active app/source/runtime browser

apps/
  seed app only if needed for core tests
  no assumption that production apps live in the core repo

ards/
  active decision records only

fixtures/
  golden valid/invalid examples

docs/
  refactor packet
  concept wiki source
  migration notes
```

Generated app repos should have their own source, ARDs, tests, scenarios,
workbench server, candidate-upstream lane, and runtime evidence. The core repo
provides the machinery that makes those app repos understandable.

## Phase 0B Drift To Keep Visible

Current source still contains older language and surfaces such as `catalog`,
`Edge`, `EdgeBoundary`, and broad `BoundedContext` parentage. Those names are
not automatically authoritative just because they exist in code today.

Phase 0B work should classify each occurrence as one of:

- keep and redefine,
- rename into the new model,
- move to `/junkyard`,
- delete,
- or preserve temporarily as compatibility scaffolding.

Do not silently promote old generated catalog output, demos, fixtures, or
workbench experiments into the new architecture. Real doctrine lives in this
refactor packet until code catches up.
