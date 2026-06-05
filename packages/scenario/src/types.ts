// ---------------------------------------------------------------------------
// @rta/scenario — shared types for scenario capture + replay
//
// Philosophy: round up generously. Capture everything conceivable.
// Storage is cheap; a missing entry cannot be added retroactively.
// Visualization can filter and tune later.
// ---------------------------------------------------------------------------

export type TimelineKind =
  | "command"
  | "event"
  | "execution"
  | "repo"
  | "rule"
  | "decision"
  | "reaction"
  | "process-manager"
  | "note"

// ---------------------------------------------------------------------------
// Existing entry kinds
// ---------------------------------------------------------------------------

export interface CommandEntry {
  kind: "command"
  name: string
  context: string
  payload?: Record<string, unknown>
  correlationId?: string
  t: number        // ms since scenario start
}

export interface EventEntry {
  kind: "event"
  name: string
  from: string     // publishing context
  to: string       // subscribing context
  payload?: Record<string, unknown>
  correlationId?: string
  causationId?: string
  messageId?: string
  t: number
}

export interface ExecutionEntry {
  kind: "execution"
  primitiveType: string
  primitiveName: string
  phase: string
  context?: string
  aggregate?: string
  input?: string
  output?: string
  reason?: string
  with?: ReadonlyArray<string>
  lineage?: ReadonlyArray<string>
  boundary?: {
    system: string
    operation: string
    mode: "dry-run" | "staged" | "committed" | "read"
    reviewRequired?: boolean
  }
  correlationId?: string
  causationId?: string
  messageId?: string
  triggerEvent?: string
  outcome?: string
  violation?: string
  messageTag?: string
  line: string
  t: number
}

export interface RepoEntry {
  kind: "repo"
  op: "read" | "write"
  aggregate: string
  context?: string          // derived context (added alongside existing id/state)
  id: string | undefined
  state?: Record<string, unknown>
  t: number
}

// ---------------------------------------------------------------------------
// New entry kinds — domain logic primitives
// ---------------------------------------------------------------------------

export interface RuleEntry {
  kind: "rule"
  name: string
  aggregate: string
  context: string
  passed: boolean
  /** The violation _tag, present only when passed === false */
  violation?: string
  /** Human-readable message from the violation, if provided */
  violationMessage?: string
  /** Sanitised input snapshot — what the rule was checked against */
  input?: Record<string, unknown>
  t: number
}

export interface DecisionEntry {
  kind: "decision"
  name: string
  context: string
  /** The outcome _tag selected by the Decision */
  outcome: string
  /** Sanitised input snapshot */
  input?: Record<string, unknown>
  t: number
}

export interface ReactionEntry {
  kind: "reaction"
  name: string
  triggerEvent: string
  from: string
  to: string
  emittedCommands: string[]
  t: number
}

export interface ProcessManagerEntry {
  kind: "process-manager"
  name: string
  context: string
  triggerEvent: string
  prevState?: Record<string, unknown>
  nextState: Record<string, unknown>
  emittedCommands: string[]
  t: number
}

/** Inline human annotation — renders as a callout between narration steps. */
export interface NoteEntry {
  kind: "note"
  text: string
  t: number
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type TimelineEntry =
  | CommandEntry
  | EventEntry
  | ExecutionEntry
  | RepoEntry
  | RuleEntry
  | DecisionEntry
  | ReactionEntry
  | ProcessManagerEntry
  | NoteEntry

// ---------------------------------------------------------------------------
// ScenarioCapture — written to .rta-captures/ after each captureScenario run
// ---------------------------------------------------------------------------

export interface ScenarioCapture {
  /** vitest describe path joined with " > " */
  suite: string
  /** it() description */
  name: string
  /** URL-safe slug: "booking-flow/book-and-confirm" */
  slug: string
  /**
   * Optional UX-level description of what this scenario represents.
   * e.g. "Patient selects a slot and taps 'Book'"
   */
  description?: string
  /** Optional tags for filtering/grouping captures in the visualizer. */
  tags?: string[]
  passed: boolean
  failures: string[]
  durationMs: number
  timeline: TimelineEntry[]
  capturedAt: string
}

// ---------------------------------------------------------------------------
// SuiteCapture — written by the vitest reporter for the whole test file
// ---------------------------------------------------------------------------

export interface TestMeta {
  suite: string
  name: string
  slug: string
  passed: boolean
  durationMs: number
}

export interface SuiteCapture {
  file: string    // relative path, e.g. "test/appointment.test.ts"
  tests: TestMeta[]
  capturedAt: string
}
