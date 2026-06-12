# Feature Requests

This document collects the desired product surface for the RTA app builder and
workbench. It is intentionally user-facing: it names what should exist, not how
it must be implemented.

## Workbench Shell

Serve a project-local workbench for exactly one current RTA app repo. The
workbench is the place to inspect, run, debug, and understand that app while it
is being built.

The RTA core repo builds the CLI, server, schemas, generators, catalog model,
and app-builder machinery. It is not itself the place where many app projects
are listed as resident apps. A normal app-authoring flow should look like
`rta init my-app`: create a directory, create a repo, generate one app, and
start a server/workbench attached exclusively to that app.

Requested surfaces:

- project overview
- available vocabulary / lego blocks
- available CLI commands
- app-local vs core vs candidate-upstream inventory for the current app
- DDD/hex wiring diagrams
- source explorer
- concept wiki for stable RTA mental models
- ARD/declaration explorer
- scenario/evidence view
- logs and raw process output
- playhead timeline
- probe/request runner
- canvas/HUD views that can hold most other workbench content as cards

## Themeable Website

The workbench should be highly themeable from the start. Visual design is
expected to change frequently, so themes need to be cheap to edit.

Requested capabilities:

- explicit theme tokens
- live in-page color controls
- easy color experimentation
- themeable graph colors
- themeable syntax highlights
- themeable panel chrome and tooltip styling
- reversible theme changes

## Source Renderer

The workbench needs a real source renderer, not just links to files.

Requested capabilities:

- load and render project files
- syntax highlighting
- line anchors
- RTA-specific highlighting
- source-to-concept links
- concept-to-source links
- go-to-definition links
- rich tooltips for RTA terms
- recursive/stackable tooltips

## Concept Wiki

The concept wiki is for stable RTA mental models, not day-to-day source
discovery. It should help a person get their head around RTA's set-in-stone
principles: what the framework means by edge, step, flow, port, adapter, rule,
decision, aggregate, evidence, candidate upstream, tier, and similar terms.

Source discovery belongs in the source renderer, graph, cards, and catalog
surfaces. The concept wiki may link to source examples, but it should not become
a dumping ground for every current element under development.

Requested capabilities:

- articles for core RTA concepts
- durable definitions
- rationale and mental-model explanations
- canonical examples
- links to source examples where helpful
- links to related concepts
- "getting your head around RTA" reading path

## Infinite Canvas Visualizer

The visualizer should make app structure inspectable and designable. The canvas
should be able to contain most workbench content as cards, not only graph nodes:
source cards, concept cards, trace cards, probe cards, log cards, command cards,
and evidence cards.

Requested capabilities:

- infinite canvas
- SVG-based drawing
- DDD/hex wiring diagrams
- flow maps
- edge/step diagrams
- port/adapter diagrams
- reusable card-scale components
- source cards
- probe/trace cards
- log/evidence cards
- command cards
- hand-tuned layouts
- saved views pegged to wiring diagrams

## Saved Views

Saved views preserve how a human wants to look at a wiring diagram and its
related workbench cards without changing the source/declaration model.

Requested capabilities:

- save layout state
- save selected panels
- save placed cards
- save card size/scale
- save visible layers
- save theme/presentation choices
- associate a view with a graph/wiring context
- restore the same view later

## HUD Layer

Some workbench tools should live in a HUD layer rather than the infinite canvas.
The HUD does not infinite-scroll with the diagram, but it should still be part of
the saved view and use the same creation, dragging, scaling, and composition
ideas as canvas cards.

Requested capabilities:

- floating HUD panels
- draggable/scalable HUD cards
- HUD state saved with a view
- terminal/observable CLI panel as a HUD element
- probe runner panel as a HUD element
- logs/errors panel as a HUD element
- source/trace focus panels as HUD elements

## Hot Component Iteration

The visual layer will be vibe-coded heavily, so component feedback loops need to
be fast.

Requested capabilities:

- hot reloading for components
- hot reloading for cards
- hot reloading for renderers
- hot reloading for panels
- no full rebuild where a lighter reload is feasible

## Playhead Timeline

App creation should be visible as a scrub-able story, closer to git history than
a log stream. This feature needs real design work; the rough requirement is
known, but the exact interaction model is still open.

Requested capabilities:

- checkpoint timeline
- command history
- source edits
- generated files
- diffs
- checks
- scenario results
- probe results
- evidence emitted by each run
- restore/check out a checkpoint
- compare checkpoints

## Postman Lite Probe Runner

The workbench should include a small request/probe runner that kicks off app
behavior and creates a trace.

Requested capabilities:

- run a flow
- run a step
- run a scenario
- run a command
- call a runtime endpoint
- provide structured inputs
- produce a specific trace view
- replay where safe
- compare traces across checkpoints

## Observable CLI

The CLI should be the normal doorway into app-building work. In the workbench,
observable CLI output should first appear as a view/HUD element: a terminal-like
surface that shows commands, effects, diffs, checks, logs, and errors as the work
happens.

Requested capabilities:

- run commands through an observable choke point
- stream command events
- stream Effect lifecycle events
- stream diffs
- stream logs
- stream checks and scenario results
- show errors and recovery hints

## Candidate Upstream Lane

Each app project should be allowed to invent locally, but reusable-looking
things must be clearly labeled. Candidate upstream is a lane inside an app repo
until promotion work happens; the core repo should expose the machinery and
review surface for that lane, not pretend every candidate already belongs to
core.

Requested capabilities:

- mark an app-local item as candidate upstream
- explain why it might be reusable
- show where it is used
- show tests/evidence
- compare with existing core vocabulary
- promote to core later
- keep app-local invention visibly app-local until promoted

## Future Agent Harness

Eventually, `rta init my-app` should be able to create an app repo with an agent
harness already wired in: safe task execution, observable commands, app-local
candidate-upstream capture, and review artifacts. This is explicitly a future
wishlist item. The near-term work is to make the CLI/server/workshop clean
enough that such a harness has a stable place to attach.
