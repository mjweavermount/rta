# User Stories

This document describes the human and agent workflows the RTA app builder and
workbench should support.

## Create A New RTA App

As an app author, I want to run an RTA CLI command that creates a new app repo or
project directory, so that I start from a visible, disciplined structure instead
of an empty folder.

Acceptance:

- generated project has source, declarations, tests, scenarios, and workbench
  wiring
- first checkpoint is recorded
- workbench can open the new project
- generated story is visible in the playhead

## Learn RTA's Mental Model

As an app author, I want a concept wiki focused on stable RTA principles, so that
I can get my head around the framework before diving into source discovery.

Acceptance:

- concept wiki explains stable meta-principles
- concept wiki is not a dump of every active source element
- core terms link to canonical examples
- source discovery remains available through source/graph/card surfaces

## Understand What Exists

As an app author, I want to open the workbench and see the available vocabulary,
commands, concepts, and project pieces, so that I know what I can build with.

Acceptance:

- vocab/concept list exists
- CLI command list exists
- core vs app-local vs candidate-upstream labels are visible
- each item links to source/declarations/tests where available

## Browse Source With RTA Context

As an app author, I want the source renderer to explain RTA-specific terms while
I read code, so that I can understand generated and hand-written pieces without
memorizing the framework.

Acceptance:

- source renders with syntax highlighting
- RTA terms are highlighted
- go-to-definition works for known RTA symbols
- tooltips explain terms
- tooltip terms can open more tooltips

## See How The App Is Wired

As an app author, I want a wiring diagram that shows flows, edges, steps, ports,
adapters, rules, decisions, aggregates, and evidence, so that I can understand
the app as a system and see the structure that actually makes it run.

Acceptance:

- graph nodes link to source/declarations
- graph distinguishes roles
- diagram can be inspected from source and source can be reached from diagram
- inferred nodes are labeled as inferred
- wiring graph represents executable app wiring, not only documentation

## Draw The App Nicely

As an app author, I want reusable visual components and source/trace/log cards on
an infinite canvas, so that the diagram can become a real thinking surface rather
than an ugly generated graph.

Acceptance:

- graph data and layout data are separate
- card-scale components are reusable
- source cards can be placed on canvas
- trace/probe/log/evidence cards can be placed on canvas
- layout can be hand-tuned
- saved view restores the layout

## Arrange A HUD

As an app author, I want a HUD layer for terminal/probe/log/source focus panels,
so that important tools can stay visible without panning away with the infinite
canvas.

Acceptance:

- HUD cards can be created, dragged, and scaled
- HUD state is saved with the view
- HUD does not mutate source/declaration state
- observable CLI can be shown as a HUD element

## Save A Useful View

As an app author, I want to save a diagram view, so that I can return to the
same layout, panels, theme, and visible layers later.

Acceptance:

- view is pegged to a graph/wiring context
- view stores presentation state
- view stores placed canvas cards
- view stores HUD cards/panels
- source/declaration state is unchanged
- view can be reopened

## Theme The Workbench

As an app author, I want live color controls and theme tokens, so that I can
experiment with the look of the workbench without fighting scattered CSS.

Acceptance:

- theme tokens drive major UI colors
- live color adjustment exists
- changes are reversible
- source/model APIs are unaffected

## Watch An Agent Build

As Virgil, I want to tell an agent to build vocabulary or app pieces through the
CLI and watch the commands, effects, diffs, checks, and logs stream by, so that I
can trust the work without reading every file manually.

Acceptance:

- command appears in workbench
- files read/written are visible
- diffs are visible
- checks/scenarios/probes are visible
- logs/errors are visible
- resulting checkpoint is recorded

## Scrub Through App Creation

As Virgil, I want a playhead timeline for app creation, so that I can scrub
through the story of how the app came into being.

Acceptance:

- checkpoints are listed
- checkpoint diffs are visible
- checkpoint source/declarations are visible
- probes can run against a checkpoint
- evidence remains linked to checkpoints

## Run A Probe

As an app author, I want a Postman-lite runner that starts a flow, step,
scenario, command, or endpoint, so that I can see the exact trace of what
happened.

Acceptance:

- input is captured
- target is captured
- generated request/command is captured
- validation/sanitization results are captured
- decisions and step behavior are captured
- logs/events/state changes are captured
- output/errors are captured
- trace links to source/declarations

## Compare Behavior Across Checkpoints

As an app author, I want to run the same probe against two checkpoints, so that I
can understand what a change did.

Acceptance:

- same probe can run against multiple checkpoints where safe
- outputs can be compared
- traces can be compared
- source diffs are nearby

## Invent Locally

As an app author, I want to add app-local vocabulary, rules, steps, or adapters,
so that I can build real app behavior without waiting for core changes.

Acceptance:

- item is labeled app-local
- source/declaration is linked
- tests/scenarios can cover it
- catalog does not pretend it is core

## Mark Candidate Upstream

As an app author, I want to mark an app-local item as candidate upstream, so that
good local inventions can be reviewed for reuse.

Acceptance:

- candidate metadata is required
- usage sites are visible
- tests/evidence are visible
- promotion target is visible
- candidate appears in a review surface

## Promote To Core

As a core maintainer, I want to promote a candidate upstream item to core only
after tests, docs, and real usage prove it belongs there.

Acceptance:

- promotion checklist exists
- docs/concept article exists
- tests exist
- at least one app usage exists
- compatibility notes exist
- app still works after promotion

## Diagnose A Failure

As an app author, I want failed checks, probes, or commands to explain what
happened and point to relevant source/declarations, so that debugging is guided.

Acceptance:

- failure includes normalized error
- raw output remains available
- structured evidence remains available
- source/declaration links are provided where possible
- recovery hints are shown when known
