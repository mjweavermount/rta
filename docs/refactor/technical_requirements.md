# Technical Requirements

This document translates the product wish list into durable technical
requirements for the RTA app builder and workbench.

## Architecture

- The RTA core repo builds the CLI, server, schemas, generators, catalog model,
  and app-builder/workshop tooling.
- The generated app repo is the unit of app work: `rta init my-app` should create
  one directory, one repo, one app, and one app-specific server/workbench.
- The workbench serves one current RTA app repo at a time.
- The model/controller layer must be stable before the visual layer is fancy.
- The visual layer must not become the source of truth.
- Source files, ARDs, generated artifacts, tests, scenarios, and runtime evidence
  must remain separately identifiable.
- Core vocabulary, app-local leaves, candidate-upstream items, and promoted core
  items must be represented explicitly.
- App-local leaves and candidate-upstream items are scoped to the generated app
  repo that defines them until an explicit promotion path moves them into core.
- The wiring graph is the executable app structure, not merely a visualization.
- Canvas and HUD views are presentation/composition surfaces over source,
  declarations, wiring, traces, logs, and evidence.

## Required Indexes

The workbench server should build and expose these indexes:

- project index
- vocabulary/concept index
- CLI command registry
- source file index
- symbol/definition index
- ARD/declaration index
- wiring graph
- source-to-concept map
- concept-to-source map
- tooltip/definition registry
- checkpoint/playhead index
- run/probe/trace index
- log/event index

All indexes are for the active app repo unless explicitly labeled as core
reference data. Core reference data is the shared vocabulary, schemas, command
surface, and reusable workshop machinery supplied by the RTA core repo.

## API Shape

The API should be clean enough that multiple UI experiments can consume it.

Required API groups:

- project metadata
- concepts and vocabulary
- commands
- source files
- source annotations
- definitions
- wiring graphs
- saved views
- checkpoints
- diffs
- scenarios
- probes
- traces
- logs/events
- themes

The API should prefer stable IDs over path-only references where possible.

The API must make scope visible. A caller should be able to tell whether an item
belongs to core RTA, the current app repo, or a candidate-upstream lane inside
that app repo.

## Source Rendering

The source renderer must support:

- file loading
- syntax highlighting
- line anchors
- source spans
- RTA-specific token annotations
- go-to-definition links
- hover/click tooltips
- recursive tooltip content
- links from generated code back to declarations where available
- links from declarations to generated/source code where available

## Tooltips

Tooltips are part of the workbench window/layering system, not one-off UI
decoration.

Requirements:

- tooltips can attach to source spans, graph nodes, ARD fields, commands, and
  vocabulary terms
- tooltip content can include terms that have their own tooltips
- mouse-over opens the tooltip while the pointer remains over the trigger
- nested mouse-over opens a child tooltip without closing the parent
- parent tooltip/card should remain reachable while child tooltip is open
- parent windows may need to shift to keep recursive navigation possible
- nested tooltips must be navigable recursively without losing the original
  context
- tooltip definitions should come from the same concept/definition registry used
  by the source renderer and stable concept docs

## Wiring Graph

The wiring graph is the app for real: it is the structure that turns a library of
lego parts into something runnable. The visual diagram renders this structure,
but the graph itself should represent executable wiring, not just documentation.

Required node/edge families:

- app
- flow
- edge
- step
- port
- adapter
- rule
- decision
- aggregate
- value/object
- scenario
- probe
- evidence

Every graph node should link back to source, declaration, generated output, or
explicit inferred evidence.

## Infinite Canvas

The canvas should consume the wiring graph and workbench cards rather than
invent app structure. It should be able to contain most workbench content as
cards: source, concepts, traces, probes, commands, logs, evidence, and graph
nodes.

Requirements:

- SVG drawing support
- reusable card-scale components
- layout data separated from graph data
- saved view state
- card placement state
- card size/scale state
- source cards
- trace/probe cards
- command/log/evidence cards
- theme token support
- layer visibility
- selected/focused node state
- no requirement that generated diagrams be visually final

## HUD Layer

The HUD layer is a saved-view presentation layer that does not pan/zoom with the
infinite canvas.

Requirements:

- HUD panels/cards use the same creation, dragging, scaling, and composition
  ideas as canvas cards
- HUD state is saved with the view
- terminal/observable CLI can live in the HUD
- probe runner can live in the HUD
- logs/errors can live in the HUD
- source/trace focus panels can live in the HUD
- HUD layout remains separate from graph/source/declaration truth

## Saved Views

A saved view is presentation state pegged to a graph/wiring context.

It may contain:

- graph context ID
- node positions
- collapsed/expanded state
- selected panels
- placed canvas cards
- HUD cards/panels
- card sizes/scales
- visible layers
- theme choice
- viewport/camera position
- annotations

It must not mutate the source/declaration model.

## Theme System

The UI must use theme tokens instead of scattered component colors.

Token groups:

- color
- typography
- spacing
- panel chrome
- graph nodes
- graph edges
- syntax highlighting
- status/severity
- tooltip styling

The workbench should expose live color controls for the active theme.

## Hot Reloading

The component development path should support fast feedback.

Requirements:

- dev server for workbench UI
- hot reload for visual components where feasible
- hot reload for SVG/card components where feasible
- no mandatory full CLI rebuild for UI-only changes
- API model stable enough that UI reloads do not restart runtime state unless
  necessary

## Observable CLI Choke Point

Meaningful CLI work should emit structured events.

Required event fields where available:

- story ID
- checkpoint ID
- command ID
- cwd
- args
- start/end timestamps
- Effect span IDs
- files read/written
- generated diffs
- check/scenario/probe IDs
- result status
- errors and recovery hints

## Log Collection

Log collection is part of the outer workbench shell.

Requirements:

- collect structured RTA events as primary evidence
- collect raw stdout/stderr/console/child-process output as fallback evidence
- keep structured evidence, raw output, and normalized errors distinct
- associate logs with story, checkpoint, run, flow, step, probe, and trace IDs
  where available

## Probe Runner

The probe runner should produce trace-first output.

Requirements:

- accept structured input
- target flow/step/scenario/command/runtime endpoint
- record generated request/command
- record validation and sanitization results
- record decisions and step/edge behavior
- record logs/events/state changes
- record output/response/errors
- link trace segments to source/declarations
- support safe replay
- support comparison across checkpoints

## Git / Checkpoint Playhead

The playhead must map app-building history to inspectable checkpoints.

This area is intentionally less settled than source rendering, wiring graphs,
and trace views. The durable requirement is that checkpoints, diffs, probes, and
evidence can be related; the exact scrubber interaction needs focused design
work.

Requirements:

- checkpoint creation
- checkpoint metadata
- git-like diff
- command/effect/log evidence per checkpoint
- probes against a checkpoint
- compare checkpoint outputs
- restore/check out a checkpoint where safe

## Candidate Upstream

Candidate upstream items must be explicit metadata, not comments in prose.

Required fields:

- item ID
- current owner
- source package/app
- candidate target package/area
- reason reusable
- current usage sites
- tests/evidence
- compatibility notes
- promotion status
