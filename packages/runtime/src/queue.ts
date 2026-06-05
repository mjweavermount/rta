import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { RuntimeClock } from "./runtime.js"

export type QueueJobStatus = "queued" | "running" | "completed" | "failed"

export interface QueueJob {
  readonly id: string
  readonly scenario: string
  readonly input: unknown
  readonly review: boolean
  readonly verbosity: "normal" | "high" | "trace"
  readonly high: boolean
  readonly status: QueueJobStatus
  readonly createdAt: string
  readonly startedAt: string | null
  readonly completedAt: string | null
  readonly result: unknown | null
  readonly error: string | null
}

export class FileQueue {
  readonly queueRoot: string

  constructor(
    readonly options: {
      readonly root: string
      readonly clock?: RuntimeClock
    },
  ) {
    this.queueRoot = join(options.root, ".rta", "queue")
    mkdirSync(this.queueRoot, { recursive: true })
  }

  enqueue(options: {
    readonly scenario: string
    readonly input?: unknown
    readonly review?: boolean
    readonly verbosity?: "normal" | "high" | "trace"
    readonly high?: boolean
  }): QueueJob {
    const id = `job-${this.nowIso().replace(/[:.]/g, "-")}`
    const job: QueueJob = {
      id,
      scenario: options.scenario,
      input: options.input ?? {},
      review: options.review ?? false,
      verbosity: options.verbosity ?? "normal",
      high: options.high ?? false,
      status: "queued",
      createdAt: this.nowIso(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    }
    this.write(job)
    return job
  }

  list(): ReadonlyArray<QueueJob> {
    return readdirSync(this.queueRoot)
      .filter((name) => name.endsWith(".json"))
      .map((name) => this.read(name.replace(/\.json$/, "")))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  next(): QueueJob | null {
    return this.list().find((job) => job.status === "queued") ?? null
  }

  read(id: string): QueueJob {
    return JSON.parse(readFileSync(join(this.queueRoot, `${id}.json`), "utf8")) as QueueJob
  }

  update(id: string, patch: Partial<QueueJob>): QueueJob {
    const job = { ...this.read(id), ...patch }
    this.write(job)
    return job
  }

  write(job: QueueJob): void {
    writeFileSync(join(this.queueRoot, `${job.id}.json`), JSON.stringify(job, null, 2))
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}
