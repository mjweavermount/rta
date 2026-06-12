# RTA Refactor Packet

This directory is the working target for the next major RTA refactor. It is
intentionally more specific than the older reset notes: it names the concepts,
contracts, checks, and migration sequence that should turn RTA from a useful
prototype into a disciplined TypeScript + Effect application framework.

The goal is not to preserve every current abstraction. The goal is to preserve
the good parts that make RTA worth having:

- TypeScript and Effect as the runtime spine.
- DDD and hexagonal architecture as boundary discipline, not ceremony.
- Steps and flows as the readable story of work.
- Explicit defensive boundary/translation before steps receive input.
- Automatic evidence at every meaningful boundary.
- Tiers, branded types, and generators that make it hard for agents to invent
  unsupported structure.
- A shipped concept wiki that explains stable RTA ideas.
- A generated app workbench/server that shows source, tests, ARDs, graphs, and
  runtime evidence for one app workspace.

## Documents

- [Refactor Overview](refactor-overview.md): the short goals, process, and
  final repo shape.
- [Shipyard, Dry Dock, Ship](shipyard-model.md): the internal metaphor for the
  RTA core repo, generated app workspaces, and the app being built.
- [Requirements](requirements.md): the refactor requirements in detailed form.
- [Concept Model](concept-model.md): the vocabulary RTA should converge on.
- [Operation Contracts](operation-contracts.md): boundary/translator, flow,
  step, port, adapter, rule, decision, and evidence contracts.
- [T1 Vocabulary Spec](t1-vocabulary-spec.md): admission rules, candidate T1
  categories, missing primitives, and repair plan.
- [Testing And Evidence](testing-and-evidence.md): native test layers and the
  evidence model each layer should produce.
- [Catalog And Source Wiki](catalog-and-source-wiki.md): legacy name for the
  future wiki/workbench split; this doc should be split or renamed as the model
  settles.
- [Phase 0B Drift Register](phase-0b-drift-register.md): known legacy surfaces
  and weirdness that must stay visible while the refactor proceeds.
- [Feature Requests](feature_requests.md): the desired app-builder/workbench
  product surface collected from the design conversation.
- [Technical Requirements](technical_requirements.md): model, API, source,
  graph, CLI, trace, and theme requirements behind the feature requests.
- [User Stories](user_stories.md): concrete workflows and acceptance criteria
  for app authors, core maintainers, humans, and agents.
- [Roadmap](roadmap.md): phased build sequence for the app builder/workbench.
- [Issue Tracking](issue_tracking.md): GitHub Issues usage, eternal Phase 0
  tracking, and one-way Gitea migration assumptions.
- [Migration Plan](migration-plan.md): the structural sequence for doing the
  refactor without adding one more layer of confusion.

## Junkyard

The refactor should treat legacy material as quarantined by default.

Use `/junkyard` for old docs, fixtures, examples, generated output, prototypes,
and experiments that may be worth mining but are not active doctrine.

Nothing in `/junkyard` is authoritative. Copy ideas back out only when they are
rewritten into the new model and backed by tests, QA, or active docs.

## North Star

Declare the app shape, generate the boring parts, implement the leaves, run
flows, inspect evidence.

The CLI should be the normal doorway into structural changes. The generated app
workbench should be the normal doorway into understanding one app workspace.
Runtime evidence should be the normal doorway into understanding what actually
happened. The concept wiki should remain a stable explanatory surface, not the
active source/runtime browser.

In internal design conversation, the RTA core repo is the shipyard. In product
language, `rta init my-app` creates one generated app workspace for one app.

## Current Reality Check

The app-local workbench layer does not exist yet.

Any current `rta serve` / catalog page is an exploratory source/catalog probe,
not the designed generated-app workbench and not evidence that the product
server model is settled. The old fused "catalog" concept is deprecated.

Do not add npm scripts that imply a finished workbench until the generated-app
workspace layer exists.

## Two Development Lanes

RTA needs two different test surfaces:

1. A disposable `rta init` acceptance lane.

   This lane creates a temporary app workspace, checks that the scaffold is
   shaped correctly, and then deletes it. It proves the product CLI can create a
   new single-app workspace.

2. A persistent dev-app lane.

   This lane is a stable app workspace kept around for repeated manual and
   automated testing. It should not be torn down every run. It is where humans
   and agents can iterate on workbench visibility, source rendering, command
   streams, diffs, traces, and app-local candidate-upstream behavior.

Neither lane should point at the RTA core repo root and pretend the core repo is
itself an app workspace.
