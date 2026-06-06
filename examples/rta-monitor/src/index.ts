import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

export type ObservedStatus = "completed" | "denied" | "rejected" | "fail-closed" | "error" | "unknown"

export interface ObservedEvent {
  readonly eventId: string
  readonly runId: string
  readonly app: string
  readonly operation: string
  readonly status: ObservedStatus
  readonly summary: string
  readonly timestamp: string
}

export interface ObservedReceipt {
  readonly receiptId: string
  readonly runId?: string
  readonly tool?: string
  readonly status: ObservedStatus
  readonly summary: string
}

export interface ObservedRun {
  readonly runId: string
  readonly state: unknown
  readonly events: ReadonlyArray<ObservedEvent>
  readonly receipts: ReadonlyArray<ObservedReceipt>
  readonly readableLog: string
  readonly confidence: "local-artifact"
}

const runRoot = (root: string): string => join(root, ".rta", "runs")

const readJson = (path: string): unknown =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}

const readJsonl = <T>(path: string): ReadonlyArray<T> =>
  existsSync(path)
    ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as T)
    : []

export const listRunIds = (root: string): ReadonlyArray<string> =>
  existsSync(runRoot(root))
    ? readdirSync(runRoot(root)).filter((name) => existsSync(join(runRoot(root), name, "state.json"))).sort()
    : []

export const showRun = (root: string, runId: string): ObservedRun => {
  const rootPath = join(runRoot(root), runId)
  return {
    runId,
    state: readJson(join(rootPath, "state.json")),
    events: readJsonl<ObservedEvent>(join(rootPath, "operation-events.jsonl")),
    receipts: readJsonl<ObservedReceipt>(join(rootPath, "receipts.jsonl")),
    readableLog: existsSync(join(rootPath, "readable.log")) ? readFileSync(join(rootPath, "readable.log"), "utf8") : "",
    confidence: "local-artifact",
  }
}

export const listRuns = (root: string): ReadonlyArray<ObservedRun> =>
  listRunIds(root).map((runId) => showRun(root, runId))

export const listFailures = (root: string): ReadonlyArray<ObservedRun> =>
  listRuns(root).filter((run) =>
    run.receipts.some((receipt) =>
      receipt.status === "denied" ||
      receipt.status === "rejected" ||
      receipt.status === "fail-closed" ||
      receipt.status === "error",
    ),
  )

export const summarizeRun = (run: ObservedRun): string => {
  const receipt = run.receipts[0]
  const status = receipt?.status ?? "unknown"
  const operation = receipt?.tool ?? run.events[0]?.operation ?? "unknown"
  return `${run.runId} ${operation} ${status} (${run.confidence})`
}
