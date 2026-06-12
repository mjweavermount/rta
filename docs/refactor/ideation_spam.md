# Ideation Spam

Loose notes and raw requirement sketches. This file is intentionally less
polished than the refactor specs.

## App Builder / Visualizer Requirements

### Early Product Thrust

- The RTA CLI/workbench must make app creation visible as a playhead timeline.
- A user should be able to watch an app being built step by step.
- The timeline should show command, generated files, declarations, source,
  checks, scenarios, catalog changes, and human-review points.
- The timeline is both a test artifact and a teaching artifact.
- Timeline positions should behave like commit-like checkpoints: each important
  point in the story has a concrete repo state that can be inspected, diffed,
  checked out, and exercised.
- Some checkpoints come from CLI commands; some come from actual source edits.
- Each checkpoint should be independently probeable. A user should be able to
  send canned requests/events through the app at that point and see what happens.
- CLI user-story tests should produce replayable transcripts/timelines, not only
  pass/fail results.
- Visible demos should let a human scrub through what happened during `rta init`,
  `rta check`, `rta serve`, and follow-on generation commands.
- The workbench should answer: what changed, why it changed, what validated it,
  and what remains unknown.
- This matters because RTA is the factory that creates other project dirs/repos/apps.
- The CLI should have a choke point that can run commands inside an observable
  Effect context and stream command/effect/diff/log events to the workbench.
- When an agent builds vocabulary or edits source through the CLI, the user
  should be able to watch the literal commands, their effects, resulting diffs,
  checks, and logs on the same workbench page.
- Keep this model/controller first. The web view will need many iterations, so
  the event model must be clean before the UI is clever.
- Log collection belongs to the outer shell/workbench design. It is related to,
  but separate from, the app/runtime logging spec.
- For log collection, RTA-native Effect events are the primary structured path;
  stdout/stderr/console/child-process capture is the messy fallback path used
  when non-RTA code explodes.
- The workbench should separate structured evidence from raw process output
  while preserving both in the same replayable story.

### CLI

- Create app project
- Register app with RTA
- Declare app-local vocab
- Mark item as candidate upstream
- Promote candidate to core
- Diff app-local vs core vocab
- List candidates by app
- Validate candidate metadata
- Check promotion readiness
- Generate app catalog
- Generate source links
- Run app scenarios
- Run app evidence checks
- Record story checkpoint
- Replay story checkpoint
- Run probes against a checkpoint
- Diff checkpoints
- Export story timeline
- Run observable command
- Stream command events to workbench
- Stream source diffs to workbench
- Stream check/scenario/log events to workbench
- Collect structured RTA events
- Collect raw process output
- Export app architecture map
- Show dependency graph
- Detect unlabeled invention
- Detect stale candidates
- Package local app modules
- Pin RTA core version
- Upgrade app to new RTA version
- Explain why a check failed

### Web / Visualizer

- App overview
- Core vs app-local vs candidate upstream badges
- Candidate upstream dashboard
- Promotion readiness view
- Source explorer
- ARD/declaration explorer
- Concept wiki
- Vocab browser
- Architecture graph
- Flow map
- Edge/step view
- Port/adapter view
- Scenario coverage view
- Evidence/log view
- Unknowns/gaps view
- Click source to concept
- Click concept to source
- Click candidate to promotion checklist
- Compare app-local item to core item
- Show package/version provenance
- Show confidence level: inferred, declared, tested, observed, human-approved
- Human review queue
- Terminal/effect stream
- Diff stream
- Log stream
- Webserved workbench for one current project/repo
- Available vocabulary / lego blocks
- Available CLI commands
- DDD/hex wiring as source-linked data and visualization input
- Source browser with RTA-specific highlighting and go-to-definition links
- Rich tooltips for RTA terms, declarations, generated code, and source code
- Recursive/stackable tooltips so definitions can explain definitions
- Floating panels/tools and infinite-canvas UI as view-layer iteration
- Durable APIs for vocabulary, commands, symbols, wiring, definitions,
  checkpoints, events, diffs, probes, and logs
- Highly themeable UI shell from the start
- Theme tokens for color, spacing, typography, panel chrome, graph colors,
  syntax highlights, status colors, and tooltip styling
- Live in-page color adjusters for quick visual experiments
- Theme changes should be cheap and reversible without changing model/API code
- Source renderer as a primary inspection surface, not only raw file links
- Source rendering includes syntax highlighting, RTA annotations, line anchors,
  source-to-concept links, go-to-definition behavior, and tooltips
- Infinite-canvas SVG drawing tools
- Reusable card-scale visual components for app/wiring diagrams
- Saved views pegged to a wiring diagram or graph context
- Saved views preserve layout, layers, panels, theme choices, and presentation
  state without changing source/declaration state
- Excellent hot reloading for visual components, cards, renderers, and panels
- Vibe-coded UI changes should be visible without rebuilds where feasible
- Postman lite probe/request runner
- Probe runner accepts inputs for flows, steps, scenarios, commands, and runtime
  endpoints
- Probe output becomes a specific trace view
- Trace captures input, selected target, generated request/command,
  validation/sanitization, decisions, logs/events, state changes, output/errors,
  and source/declaration links
- Probe traces should be linkable, replayable where safe, and comparable across
  checkpoints

### Organizational

- Core maintainers own RTA vocab
- App owners own app-local leaves
- Candidate upstream has explicit owner
- Promotion requires tests
- Promotion requires docs/concept description
- Promotion requires at least one real app use
- Promotion should preserve app compatibility
- No silent invention
- No unlabeled architectural terms
- App-specific stays app-specific by default
- Reusable-looking things start as candidates
- Candidates age or get resolved
- Breaking core changes need migration notes
- App upgrades are tracked
- Human approval required for promotion
- Catalog is review surface
- CLI checks are enforcement surface
- Git history is decision trail
- Package/version boundaries are explicit
- Verdaccio/private registry is optional later infrastructure
