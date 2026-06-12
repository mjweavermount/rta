# Shipyard, Dry Dock, Ship

This is an internal metaphor for RTA's repo and product boundaries.

The metaphor is for us, not for every app author. It should clarify ownership
and workflow during design conversations, but it should not become required
product vocabulary in generated apps, user-facing docs, or normal CLI output.

The only source/user-facing name that should intentionally carry this language
is the internal shipyard CLI, likely `rta-shipyard`.

Everywhere else, prefer plain product language:

- RTA core repo
- generated app workspace
- app
- workbench
- candidate upstream
- source
- generated output
- runtime evidence

Do not make users learn what a dry dock is to use RTA.

## Terms

### Shipyard

The **shipyard** is the RTA core repository.

In this repo, that means `/Users/virgil/Developer/rta`.

The shipyard builds the machinery:

- product CLI
- shipyard/developer CLI
- schemas
- generators
- runtime contracts
- source and workbench templates
- concept docs
- catalog/source model
- app-builder machinery
- scenario and evidence infrastructure

The shipyard is not a many-app host. It should not pretend to contain a fleet of
production apps.

### Dry Dock

A **dry dock** is our internal shorthand for one generated app workspace.

The normal product move is:

```bash
rta init my-app
```

That creates one app workspace:

- one directory
- one repo
- one app-specific workbench/server
- one app-local source tree
- one app-local declaration set
- one app-local test/scenario/probe set
- one candidate-upstream lane

A dry dock is where one app is built, inspected, tested, and reviewed. In
user-facing language, call this an app workspace or generated app repo.

### Ship

The **ship** is our internal shorthand for the app being built inside a generated
app workspace.

It is the runnable application and its domain structure:

- app
- flows and sagas
- edges
- steps
- ports
- adapters
- rules
- decisions
- aggregates
- values
- repositories
- scenarios
- probes
- runtime evidence

The ship is what eventually runs. In user-facing language, call this the app.

## CLI Split

RTA should expose two command audiences.

### `rta`

`rta` is the product CLI.

It is for app authors working in generated dry docks.

Examples:

```bash
rta init my-app
rta check
rta serve
rta scenario run
rta explain
```

This CLI should be stable, friendly, and safe to document for people building
apps.

### `rta-shipyard`

`rta-shipyard` is the internal shipyard CLI.

It is for maintaining the machinery in the core repo.

Examples:

```bash
rta-shipyard fixture regen
rta-shipyard schema audit
rta-shipyard catalog rebuild
rta-shipyard golden update
rta-shipyard migration check
```

This CLI can expose sharper tools, internal repair commands, migration aids, and
fixture/golden machinery that app authors should not need.

## Boundary Rules

- The RTA core repo creates generated app workspaces.
- A generated app workspace contains one app.
- An app can produce candidate-upstream ideas.
- Candidate-upstream ideas may later move back into the shipyard deliberately.
- Generated output is build artifact, not source truth.
- Runtime evidence is observed behavior, not declaration.
- Concept articles explain durable RTA ideas; they are not a source inventory,
  app inventory, ARD dump, or generated file browser.
- The app workbench is app-local. The RTA core repo defines its template and
  machinery.

## Product Shape

The desired loop is:

1. Use the product CLI to create one generated app workspace.
2. Build one app in that workspace.
3. Use the app-local workbench to inspect source, declarations, generated files,
   wiring, scenarios, probes, logs, diffs, and evidence.
4. Mark app-local discoveries as candidate-upstream when they might belong in
   reusable RTA core.
5. Promote candidate-upstream ideas back into the shipyard only through explicit
   schema/generator/test/doc work.

## Naming Guidance

Use these phrases in internal design conversation:

- RTA core repo: **shipyard**
- generated app workspace: **dry dock**
- runnable app under construction: **ship**
- app-local inspection server: **workbench**
- reusable core machinery: **shipyard machinery**
- app-local reusable proposal: **candidate upstream**

Use these phrases in product/user-facing surfaces:

- RTA core repo
- generated app workspace
- app
- workbench
- candidate upstream
- source
- generated output
- runtime evidence

Avoid vague substitutes like "deep" for the internal CLI. Prefer `rta-shipyard`
if we want the internal CLI to carry the metaphor explicitly.
