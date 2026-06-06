import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { listFailures, listRunIds, listRuns, showRun, summarizeRun } from "../src/index.js"
import { runCli } from "../src/cli.js"

let root: string

const writeRun = (runId: string, status: string) => {
  const dir = join(root, ".rta", "runs", runId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "state.json"), JSON.stringify({ runId, status }))
  appendFileSync(join(dir, "operation-events.jsonl"), `${JSON.stringify({
    eventId: `event-${runId}`,
    runId,
    app: "test-app",
    operation: "test.operation",
    status,
    summary: "I did x because y.",
    timestamp: "2026-06-05T00:00:00.000Z",
  })}\n`)
  appendFileSync(join(dir, "receipts.jsonl"), `${JSON.stringify({
    receiptId: `receipt-${runId}`,
    runId,
    tool: "test.operation",
    status,
    summary: "I did x because y.",
  })}\n`)
  writeFileSync(join(dir, "readable.log"), `[normal] test.operation ${status}\n`)
}

describe("rta monitor", () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "rta-monitor-"))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("lists, shows, and summarizes local runs", () => {
    writeRun("run-a", "completed")

    expect(listRunIds(root)).toEqual(["run-a"])
    expect(showRun(root, "run-a").receipts).toHaveLength(1)
    expect(summarizeRun(showRun(root, "run-a"))).toContain("test.operation completed")
    expect(listRuns(root)).toHaveLength(1)
  })

  it("finds fail-closed runs", () => {
    writeRun("run-a", "completed")
    writeRun("run-b", "fail-closed")

    expect(listFailures(root).map((run) => run.runId)).toEqual(["run-b"])
  })

  it("runs the monitor CLI", () => {
    writeRun("run-a", "completed")
    const lines: string[] = []

    expect(runCli(["runs", "--root", root], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["tail", "--root", root], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["show", "run-a", "--root", root], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["show", "--root", root], { log: (line) => lines.push(line) })).toBe(1)
    expect(runCli(["help"], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["wat"], { log: (line) => lines.push(line) })).toBe(1)
    expect(lines.join("\n")).toContain("run-a")
    expect(lines.join("\n")).toContain("usage:")
  })
})
