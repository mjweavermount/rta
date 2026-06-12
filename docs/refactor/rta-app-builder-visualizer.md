# RTA App Builder Visualizer

This document is a lightweight anchor for the app-builder and source-explorer
side of the RTA refactor.

## Project Layers

RTA work should be organized around three layers:

1. **RTA core** owns the stable language, primitives, checkers, CLI, catalog
   machinery, and reusable architecture concepts.
2. **RTA app projects** own mostly leaf implementations: app-specific flows,
   edges, steps, adapters, rules, decisions, tests, scenarios, deploy shape, and
   local vocabulary.
3. **Candidate upstream** is the explicit lane for app-local ideas that look
   reusable but have not earned their way into core yet.

The important project-management rule is:

> Apps may invent locally, but invention must be labeled.

An app project should make it easy to mark something as candidate upstream
without pretending it is already core. Candidate items should carry enough
context for later promotion: why it might be reusable, where it is used, what
tests prove it is not app-specific, and what core package or vocabulary area it
would move into.

## Packaging Notes

Start simple with workspace, path, or git dependencies between RTA core and app
projects. A private package registry such as Verdaccio on the tower may become
useful later when multiple apps need stable internal package versions, but it is
not required for the first slice.

The builder/visualizer should understand this distinction:

- core package
- app-local leaf
- candidate upstream
- promoted upstream/core item

That classification should be visible in the catalog so humans and agents can
tell whether they are looking at stable framework vocabulary or local app
invention.

## Webserved Workbench Environment

The workbench should be a webserved environment for one current project or repo.
It should expose enough stable model/controller surfaces that the visual design
can iterate later without changing the underlying truth model.

The environment should surface:

- available vocabulary / lego blocks
- available CLI commands
- source files and RTA-specific symbols
- ARDs and declarations
- DDD/hex wiring diagrams
- source-to-concept and concept-to-source links
- git/checkpoint playhead
- command/effect/log/diff streams
- probe and scenario outputs

The wiring view should explain how DDD pieces connect: edges, flows, steps,
ports, adapters, rules, decisions, aggregates, scenarios, and evidence. Every
visual node should have a corresponding source/declaration reference where
possible.

The source view should support:

- go-to-definition links for RTA-specific terms and symbols
- highlighted RTA concepts in code
- rich tooltips for terms, declarations, and generated/source relationships
- recursive/stackable tooltips, where a tooltip can expose terms that have their
  own definitions/tooltips

The canvas/view layer is intentionally deferred. The design should assume
floating panels/tools and an infinite-canvas style visualizer, but the first
durable work is the underlying indexes/APIs:

- vocabulary index
- command registry
- source/symbol index
- wiring graph
- definition/tooltip registry
- checkpoint/playhead model
- log/event/diff/probe feeds

The workbench UI shell should be highly themeable from the start. Visual design
will iterate heavily, so color, spacing, typography, panel chrome, graph colors,
syntax highlights, status colors, and tooltip styling should be driven by a
small set of explicit theme tokens rather than scattered component styles.

At minimum, the served workbench should support live in-page color adjustment for
the active theme. The point is not to finalize a theme early; it is to make
visual experimentation cheap, reversible, and visible while the underlying model
stays stable.

The workbench needs a source renderer, not just file links. It should load
project files and render them with useful structure: syntax highlighting,
RTA-specific annotations, source-to-concept links, go-to-definition behavior,
line anchors, and tooltips. Source rendering should be good enough to act as a
primary inspection surface during app design.

The visualizer should support high-quality SVG drawing on an infinite canvas.
The goal is not only to auto-generate diagrams, but to let humans and agents get
fiddly about how an app is drawn. The drawing layer should support reusable
card-scale components that can be designed, iterated, and reused across wiring
diagrams.

Views should be saveable. A saved view is expected to be pegged to a wiring
diagram or graph context, preserving layout choices, selected panels, visible
layers, theme choices, and other presentation state without changing the
underlying source/declaration model.

Component iteration should have excellent hot reloading. The expected workflow is
that humans and agents will vibe-code visual components, cards, renderers, and
panels, then immediately see the result in the served workbench when possible.
Avoid rebuild-heavy feedback loops where a lighter dev-server or module reload
path is feasible.

The workbench should include a "Postman lite" style probe/request runner. It
should let a human provide inputs to kick off a flow, step, scenario, command, or
runtime endpoint, then turn that run into a specific trace view.

This is not meant to become a generic API-client clone first. The important
behavior is that a probe run produces inspectable evidence:

- exact input
- selected target
- command/request generated
- validation and sanitization results
- step/edge decisions
- emitted logs/events
- state changes
- output/response
- errors and failure hints
- source/declaration links for the path taken

Probe traces should be linkable, replayable where safe, and comparable across
checkpoints.

## Playhead Timeline

An early thrust for the app builder/workbench is a scrutable playhead timeline of
building an app.

RTA is not only a library used inside an app. It is also the tool used to create
the project directory, repo shape, declarations, source files, tests, scenarios,
and workbench view for that app. The user-story test target is therefore the
whole creation experience.

The timeline should make each construction step inspectable:

- command run
- prompt/input accepted
- files created or changed
- source edits made by a human or agent
- ARDs/declarations generated
- source generated or linked
- checks run
- scenarios run
- catalog/workbench state changed
- unknowns or human-review points surfaced

The playhead should be closer to a commit history than to a log stream. Each
important point in the story should correspond to a concrete checkpoint of the
project: something that can be inspected, diffed, restored, and exercised.

Checkpoints may be created by CLI commands, generated edits, manual source edits,
or agent-authored source edits. The workbench should treat all of those as part
of the same app-construction story.

At any checkpoint, the user should be able to run probes through the app and see
what that state does. These probes are not literally Postman, but they occupy the
same conceptual role: canned requests, events, commands, or scenario inputs that
exercise the app at that exact point in its history.

The visible story should therefore combine:

- checkpoint metadata
- git-like diff
- source/declaration/catalog view at that point
- runnable probes
- probe outputs
- checks/scenario results
- evidence emitted by the app while probes ran

This timeline should become both a visible demo surface and an automated test
artifact. A passing CLI story should leave behind enough evidence for a human to
scrub through what happened and understand how the app came into being.

## Observable CLI Choke Point

The CLI should route meaningful app-building work through a single observable
command/effect boundary.

This is an author-time tool, not only an ouroboros/bootstrap-time tool. When a
human or agent asks RTA to build out vocabulary, generate app pieces, run checks,
edit files, or execute probes, the CLI should emit structured events that the
workbench can consume.

The goal is that a user can watch the work happen:

- literal command invoked
- command arguments and working directory
- Effect span/effect lifecycle
- files read
- files written
- source edits
- generated diffs
- checks started/completed
- scenarios/probes started/completed
- logs emitted
- errors and recovery hints

This should have strong MVC separation. The first requirement is a clean model
and controller surface: structured events, stable identifiers, checkpoint links,
and diff/log/probe references. The visual treatment can iterate many times
without changing the underlying event story.

The workbench page can eventually show the terminal stream, diff stream, probe
results, and logs together, but the core contract is that the CLI produces a
complete observable story of what it did.

## Log Collection

Log collection is part of the outer CLI/workbench shell. It is not the full
app/runtime logging spec.

The shell should collect two classes of output:

1. **Structured RTA events** from Effect loggers, spans, steps, checks,
   scenarios, probes, and RTA-native evidence emitters.
2. **Raw process output** from stdout, stderr, console output, child processes,
   package managers, test runners, stack traces, and non-RTA code paths.

The structured path is primary. It should carry IDs such as story, checkpoint,
run, flow, step, scenario, probe, and trace where available.

The raw path is fallback/supporting evidence. It exists so the workbench can show
what happened when something escapes the clean RTA path or fails before the
structured runtime is fully engaged.

The workbench should keep these visually and semantically distinct:

- structured evidence
- raw console/process output
- normalized errors

The design goal is not to pretend scraped logs are as meaningful as RTA evidence.
The goal is to make the good path excellent and the messy path visible enough to
debug.
