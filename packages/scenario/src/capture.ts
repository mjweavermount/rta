// ---------------------------------------------------------------------------
// captureScenario — drop-in replacement for vitest's `it()` that additionally
// records a timeline and writes a ScenarioCapture JSON to .rta-captures/.
//
// When RTA_CAPTURES_DIR is not set (e.g. in pure CI), behaves exactly like
// a plain `it()` call — no file I/O, no extra overhead.
// ---------------------------------------------------------------------------

import { it } from "vitest"
import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import type { ScenarioCapture, TimelineEntry } from "./types.js"
import {
  projectExecutionEventToLogLine,
  subscribePrimitiveLifecycle,
} from "@rta/strict"

// ---------------------------------------------------------------------------
// Auto-capture bridge — registered at module load, zero test-side changes
// ---------------------------------------------------------------------------

subscribePrimitiveLifecycle((event) => {
  const capture = getCapture()
  if (!capture) return

  capture.execution(event, projectExecutionEventToLogLine(event))

  switch (event.primitiveType) {
    case "event":
      capture.event(
        event.primitiveName,
        event.from,
        event.to,
        event.payload,
        event.correlationId,
        event.causationId,
        event.messageId,
      )
      return
    case "rule":
      if (event.phase === "received") return
      capture.rule(
        event.primitiveName,
        event.aggregate,
        event.context,
        event.phase === "completed",
        event.violation,
        event.message,
        event.input,
      )
      return
    case "decision":
      if (event.phase !== "completed" || event.outcome === undefined) return
      capture.decision(event.primitiveName, event.context, event.outcome, event.input)
      return
    case "reaction":
      if (event.phase !== "completed") return
      capture.reaction(
        event.primitiveName,
        event.triggerEvent,
        event.from,
        event.to,
        [...event.emittedCommands],
      )
      return
    case "process-manager":
      if (
        event.phase !== "completed" ||
        event.nextState === undefined ||
        event.emittedCommands === undefined
      ) {
        return
      }
      capture.processManager(
        event.primitiveName,
        event.context,
        event.triggerEvent,
        event.prevState,
        event.nextState,
        [...event.emittedCommands],
      )
      return
    default:
      return
  }
})

// ---------------------------------------------------------------------------
// Capture context — module-level active builder (tests run serially in vitest)
// ---------------------------------------------------------------------------

let _active: CaptureBuilder | null = null

export class CaptureBuilder {
  readonly timeline: TimelineEntry[] = []
  private readonly start = Date.now()

  command(name: string, context: string, payload?: Record<string, unknown>): void {
    const entry: import("./types.js").CommandEntry = { kind: "command", name, context, t: Date.now() - this.start }
    if (payload !== undefined) entry.payload = payload
    this.timeline.push(entry)
  }

  event(name: string, from: string, to: string, payload?: Record<string, unknown>, correlationId?: string, causationId?: string, messageId?: string): void {
    const entry: import("./types.js").EventEntry = { kind: "event", name, from, to, t: Date.now() - this.start }
    if (payload !== undefined) entry.payload = payload
    if (correlationId !== undefined) entry.correlationId = correlationId
    if (causationId !== undefined) entry.causationId = causationId
    if (messageId !== undefined) entry.messageId = messageId
    this.timeline.push(entry)
  }

  execution(
    event: import("@rta/strict").PrimitiveExecutionEvent,
    line: string,
  ): void {
    const entry: import("./types.js").ExecutionEntry = {
      kind: "execution",
      primitiveType: event.primitiveType,
      primitiveName: event.primitiveName,
      phase: event.phase,
      line,
      t: Date.now() - this.start,
    }
    if ("context" in event && typeof event.context === "string") entry.context = event.context
    if ("aggregate" in event && typeof event.aggregate === "string") entry.aggregate = event.aggregate
    if ("summary" in event && event.summary !== undefined) {
      if (event.summary.input !== undefined) entry.input = event.summary.input
      if (event.summary.output !== undefined) entry.output = event.summary.output
      entry.reason = event.summary.reason
      if (event.summary.with !== undefined) entry.with = event.summary.with
      if (event.summary.lineage !== undefined) entry.lineage = event.summary.lineage
      if (event.summary.boundary !== undefined) entry.boundary = event.summary.boundary
    }
    if ("correlationId" in event && typeof event.correlationId === "string") entry.correlationId = event.correlationId
    if ("causationId" in event && typeof event.causationId === "string") entry.causationId = event.causationId
    if ("messageId" in event && typeof event.messageId === "string") entry.messageId = event.messageId
    if ("triggerEvent" in event && typeof event.triggerEvent === "string") entry.triggerEvent = event.triggerEvent
    if ("outcome" in event && typeof event.outcome === "string") entry.outcome = event.outcome
    if ("violation" in event && typeof event.violation === "string") entry.violation = event.violation
    if ("messageTag" in event && typeof event.messageTag === "string") entry.messageTag = event.messageTag
    this.timeline.push(entry)
  }

  expectPrimitiveSpoke(
    primitiveName: string,
    phases: ReadonlyArray<string>,
  ): void {
    const actual = this.timeline
      .filter((entry): entry is import("./types.js").ExecutionEntry =>
        entry.kind === "execution" && entry.primitiveName === primitiveName,
      )
      .map((entry) => entry.phase)
    for (const phase of phases) {
      if (!actual.includes(phase)) {
        throw new Error(
          `expected primitive ${primitiveName} to emit ${phase}; actual phases: ${actual.join(", ") || "(none)"}`,
        )
      }
    }
  }

  repo(
    op: "read" | "write",
    aggregate: string,
    id?: string,
    state?: Record<string, unknown>,
    context?: string,
  ): void {
    const entry: import("./types.js").RepoEntry = {
      kind: "repo", op, aggregate, id, t: Date.now() - this.start,
    }
    if (state !== undefined) entry.state = state
    if (context !== undefined) entry.context = context
    this.timeline.push(entry)
  }

  rule(
    name: string,
    aggregate: string,
    context: string,
    passed: boolean,
    violation?: string,
    violationMessage?: string,
    input?: Record<string, unknown>,
  ): void {
    const entry: import("./types.js").RuleEntry = {
      kind: "rule", name, aggregate, context, passed, t: Date.now() - this.start,
    }
    if (violation !== undefined) entry.violation = violation
    if (violationMessage !== undefined) entry.violationMessage = violationMessage
    if (input !== undefined) entry.input = input
    this.timeline.push(entry)
  }

  decision(
    name: string,
    context: string,
    outcome: string,
    input?: Record<string, unknown>,
  ): void {
    const entry: import("./types.js").DecisionEntry = {
      kind: "decision", name, context, outcome, t: Date.now() - this.start,
    }
    if (input !== undefined) entry.input = input
    this.timeline.push(entry)
  }

  reaction(
    name: string,
    triggerEvent: string,
    from: string,
    to: string,
    emittedCommands: string[],
  ): void {
    this.timeline.push({
      kind: "reaction", name, triggerEvent, from, to, emittedCommands,
      t: Date.now() - this.start,
    })
  }

  processManager(
    name: string,
    context: string,
    triggerEvent: string,
    prevState: Record<string, unknown> | undefined,
    nextState: Record<string, unknown>,
    emittedCommands: string[],
  ): void {
    const entry: import("./types.js").ProcessManagerEntry = {
      kind: "process-manager", name, context, triggerEvent, nextState, emittedCommands,
      t: Date.now() - this.start,
    }
    if (prevState !== undefined) entry.prevState = prevState
    this.timeline.push(entry)
  }

  note(text: string): void {
    this.timeline.push({ kind: "note", text, t: Date.now() - this.start })
  }

  elapsed(): number {
    return Date.now() - this.start
  }
}

/** Access the active capture builder from within a captureScenario body */
export function getCapture(): CaptureBuilder | null {
  return _active
}

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ---------------------------------------------------------------------------
// captureScenario
// ---------------------------------------------------------------------------

export function captureScenario(
  suite: string,
  name: string,
  fn: (capture: CaptureBuilder) => Promise<void>,
  options?: { description?: string; tags?: string[] },
): void {
  it(name, async () => {
    const capture = new CaptureBuilder()
    _active = capture
    const failures: string[] = []
    let passed = true

    try {
      await fn(capture)
    } catch (err) {
      passed = false
      failures.push(err instanceof Error ? err.message : String(err))
      throw err  // re-throw so vitest marks the test as failed
    } finally {
      _active = null
      await writeCaptureFile(suite, name, capture, passed, failures, options)
    }
  })
}

// ---------------------------------------------------------------------------
// writeCaptureFile
// ---------------------------------------------------------------------------

async function writeCaptureFile(
  suite: string,
  name: string,
  capture: CaptureBuilder,
  passed: boolean,
  failures: string[],
  options?: { description?: string; tags?: string[] },
): Promise<void> {
  const capturesDir = process.env["RTA_CAPTURES_DIR"] ?? join(process.cwd(), ".rta-captures")
  const suiteSlug = slugify(suite)
  const testSlug  = slugify(name)
  const slug = `${suiteSlug}/${testSlug}`
  const dir  = join(capturesDir, suiteSlug)

  const capture_data: ScenarioCapture = {
    suite,
    name,
    slug,
    passed,
    failures,
    durationMs: capture.elapsed(),
    timeline: capture.timeline,
    capturedAt: new Date().toISOString(),
  }

  if (options?.description !== undefined) capture_data.description = options.description
  if (options?.tags !== undefined) capture_data.tags = options.tags

  await writeScenarioArtifacts(capture_data, capturesDir)
}

export async function writeScenarioArtifacts(
  capture_data: ScenarioCapture,
  capturesDir: string,
): Promise<void> {
  const [suiteSlug, testSlug] = capture_data.slug.split("/")
  if (suiteSlug === undefined || testSlug === undefined) return
  const dir = join(capturesDir, suiteSlug)

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, `${testSlug}.json`), JSON.stringify(capture_data, null, 2), "utf-8")
    await writeFile(join(dir, `${testSlug}.readable.log`), readableLog(capture_data), "utf-8")
    await writeFile(join(dir, `${testSlug}.operation-events.json`), operationEventsJson(capture_data), "utf-8")
    await writeFile(join(dir, `${testSlug}.trace-summary.md`), traceSummary(capture_data), "utf-8")
  } catch {
    // Never fail a test because of capture I/O
  }
}

function readableLog(capture: ScenarioCapture): string {
  return capture.timeline
    .filter((entry): entry is import("./types.js").ExecutionEntry => entry.kind === "execution")
    .map((entry) => entry.line)
    .join("\n")
    .concat("\n")
}

function operationEventsJson(capture: ScenarioCapture): string {
  const events = capture.timeline.filter((entry) => entry.kind === "execution")
  return `${JSON.stringify(events, null, 2)}\n`
}

function traceSummary(capture: ScenarioCapture): string {
  const executions = capture.timeline
    .filter((entry): entry is import("./types.js").ExecutionEntry => entry.kind === "execution")
  const lines = [
    `# ${capture.name}`,
    "",
    `- Suite: ${capture.suite}`,
    `- Passed: ${capture.passed ? "yes" : "no"}`,
    `- Duration: ${capture.durationMs}ms`,
    `- Execution events: ${executions.length}`,
    "",
    "## Primitive Trace",
    "",
    ...executions.map((entry) =>
      `- ${entry.primitiveName} ${entry.phase}${entry.context !== undefined ? ` (${entry.context})` : ""}`,
    ),
    "",
  ]
  return lines.join("\n")
}
