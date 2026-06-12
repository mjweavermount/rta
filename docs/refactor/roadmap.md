# Roadmap

This roadmap organizes the RTA app builder and workbench work into buildable
slices. It is not a release commitment; it is the intended order of attack.

## Phase 0: Continuous Refactor Convergence

Goal: make the design target coherent enough to build against, while accepting
that refactor convergence will remain an ongoing lane.

Phase 0 has two parts.

### Phase 0A: Minimum Coherence Gate

This is the one-time gate before serious build work. It should produce enough
agreement that the next phases are not built on competing definitions.

Work:

- finish feature/request docs
- align concept model with feature requests
- align technical requirements with user stories
- keep old web/catalog assumptions clearly marked as replaceable
- identify current code that should be preserved vs replaced

Exit criteria:

- refactor docs agree on vocabulary
- workbench/app-builder scope is clear
- no competing definition of app/core/candidate-upstream

### Phase 0B: Eternal Cleanup Lane

This is intentionally ongoing. Later phases are expected to reveal old layers,
partial abstractions, missing concepts, confusing names, and surprisingly large
gaps.

Work:

- create named cleanup issues as gaps are found
- attach cleanup to the phase that discovered it
- pay a small refactor tax before calling each later phase done
- document escape hatches when a deep cleanup question should not block current
  progress
- keep docs, checks, CLI output, and generated catalog language converging

Operating rule:

> Do not wait for a perfect ontology before building. Do prevent every build
> slice from adding another untracked layer of confusion.

Exit criteria:

- never fully exits
- each phase leaves touched concepts cleaner or clearly debt-tracked
- no discovered weirdness remains anonymous

## Phase 1: Project Workbench API Skeleton

Goal: serve one current generated app repo with stable model APIs.

The core repo builds the CLI/server/workshop that makes this possible. The
served workbench is attached to one app repo created by `rta init my-app`, not a
many-app inventory inside the core repo.

Work:

- project metadata API
- concept/vocab index API
- CLI command registry API
- source file index API
- ARD/declaration index API
- simple catalog endpoint

Exit criteria:

- workbench can list project concepts, source files, declarations, and commands
- data comes from real repo state
- scope is visible: core reference data vs current app-local data vs current
  app candidate-upstream data
- no visual polish required

## Phase 2: Source Renderer Foundation

Goal: make source browsing a primary inspection surface.

Work:

- source file loading
- syntax highlighting
- line anchors
- source spans
- RTA-specific annotations
- go-to-definition links for known terms
- tooltip registry

Exit criteria:

- source view can explain RTA-specific terms
- concept/source links work both directions for known items
- tooltip data is reusable by source and wiki surfaces

## Phase 3: Concept Wiki And Vocab Browser

Goal: make stable RTA principles readable to humans and agents.

The concept wiki is not the active source explorer, ARD browser, or app-local
inventory. It explains stable mental models. Active vocab declarations,
candidate-upstream items, source files, and app wiring belong in catalog/source
and graph surfaces that can link back to the wiki.

Work:

- concept article schema
- stable concept pages
- "getting your head around RTA" reading path
- heredity/scope display
- canonical examples
- links out to source examples where helpful
- core/app-local/candidate-upstream badges

Exit criteria:

- core mental model is navigable
- concept wiki is not overloaded with active source discovery
- source discovery remains handled by source/graph/card surfaces

## Phase 4: Wiring Graph Model

Goal: expose the executable DDD/hex wiring structure as a graph model.

Work:

- graph schema
- nodes for flows, edges, steps, ports, adapters, rules, decisions, aggregates,
  scenarios, probes, and evidence
- source/declaration links
- inferred/declared/tested/observed confidence labels

Exit criteria:

- graph API can describe a simple app
- graph represents runnable app wiring, not just a picture
- every graph node links to evidence or admits it is inferred
- UI can render from graph without inventing app structure

## Phase 5: Workbench UI Shell

Goal: create the first durable but visually flexible UI.

Work:

- theme token system
- live color adjusters
- panel shell
- source panel
- concept panel
- graph panel placeholder
- HUD layer foundation
- command/event panel placeholder
- hot reload dev workflow

Exit criteria:

- UI is easy to restyle
- panels consume APIs rather than hardcoded data
- visual component iteration is fast

## Phase 6: Infinite Canvas And Saved Views

Goal: support designable diagrams.

Work:

- SVG/infinite canvas foundation
- reusable card-scale components
- source/trace/probe/log/evidence cards
- graph layout state
- saved views
- HUD view state
- layer visibility
- selected/focused graph state

Exit criteria:

- wiring graph can be drawn
- source and trace cards can be placed in the view
- HUD cards can be saved with the view
- human layout choices can be saved
- saved view does not mutate source/declaration model

## Phase 7: Observable CLI Choke Point

Goal: route meaningful app-building work through observable commands.

Work:

- structured command events
- Effect span/event bridge
- file read/write events
- diff capture
- check/scenario/probe events
- raw stdout/stderr fallback capture
- workbench event stream

Exit criteria:

- running an RTA command produces an inspectable story
- workbench can show command, files, diffs, checks, logs, and errors
- raw process output is visually distinct from structured evidence

## Phase 8: Playhead Timeline

Goal: make app creation scrub-able.

Work:

- checkpoint model
- checkpoint metadata
- diff links
- command/evidence links
- timeline API
- checkpoint restore/check out where safe
- checkpoint comparison

Exit criteria:

- app creation can be replayed as checkpoints
- each checkpoint can show source/declarations/diffs/evidence
- timeline becomes a human demo artifact and test artifact

## Phase 9: Probe Runner And Trace Views

Goal: make behavior easy to kick off and inspect.

Work:

- Postman-lite probe inputs
- flow/step/scenario/command/endpoint targets
- trace model
- validation/sanitization evidence
- step/edge decision evidence
- log/event/state/output capture
- replay where safe
- compare traces across checkpoints

Exit criteria:

- user can run a probe and get a trace
- trace links to source/declarations
- same probe can compare behavior across checkpoints

## Phase 10: Candidate Upstream Workflow

Goal: make local invention disciplined.

Work:

- candidate metadata schema
- candidate dashboard
- promotion checklist
- diff app-local vs core
- promotion command
- compatibility notes
- stale candidate checks

Exit criteria:

- app-local invention is visible
- candidate-upstream review is explicit
- promotion cannot happen silently

## Phase 11: Full App Builder User Story

Goal: prove the whole loop.

Demo story:

1. generate a new app
2. open workbench
3. inspect generated concepts/source/declarations
4. add app-local vocabulary
5. mark one item candidate upstream
6. run checks
7. run a probe
8. inspect trace
9. scrub checkpoints
10. save a diagram view
11. compare behavior before/after a change

Exit criteria:

- the story is automated enough to run as a regression
- the story is visual enough to use as a demo
- the generated evidence is good enough for human review
