import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Effect } from "effect"
import { RuntimeError, type RuntimeClock } from "./runtime.js"

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
  }

  ensure(): Effect.Effect<void, RuntimeError> {
    return Effect.tryPromise({
      try: () => mkdir(this.queueRoot, { recursive: true }),
      catch: (cause) => new RuntimeError("failed to initialize queue", { cause }),
    }).pipe(Effect.asVoid)
  }

  enqueue(options: {
    readonly scenario: string
    readonly input?: unknown
    readonly review?: boolean
    readonly verbosity?: "normal" | "high" | "trace"
    readonly high?: boolean
  }): Effect.Effect<QueueJob, RuntimeError> {
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
    return this.write(job).pipe(Effect.as(job))
  }

  list(): Effect.Effect<ReadonlyArray<QueueJob>, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => {
            const entries = await readdir(this.queueRoot)
            const jobs = await Promise.all(
              entries
                .filter((name) => name.endsWith(".json"))
                .map((name) => this.readUnsafe(name.replace(/\.json$/, ""))),
            )
            return jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          },
          catch: (cause) => new RuntimeError("failed to list queue jobs", { cause }),
        }),
      ),
    )
  }

  next(): Effect.Effect<QueueJob | null, RuntimeError> {
    return this.list().pipe(
      Effect.map((jobs) => jobs.find((job) => job.status === "queued") ?? null),
    )
  }

  read(id: string): Effect.Effect<QueueJob, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => this.readUnsafe(id),
          catch: (cause) => new RuntimeError("failed to read queue job", { id, cause }),
        }),
      ),
    )
  }

  update(id: string, patch: Partial<QueueJob>): Effect.Effect<QueueJob, RuntimeError> {
    return this.read(id).pipe(
      Effect.flatMap((job) => {
        const updated = { ...job, ...patch }
        return this.write(updated).pipe(Effect.as(updated))
      }),
    )
  }

  write(job: QueueJob): Effect.Effect<void, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => writeFile(join(this.queueRoot, `${job.id}.json`), JSON.stringify(job, null, 2), "utf8"),
          catch: (cause) => new RuntimeError("failed to write queue job", { id: job.id, cause }),
        }),
      ),
    )
  }

  private async readUnsafe(id: string): Promise<QueueJob> {
    return JSON.parse(await readFile(join(this.queueRoot, `${id}.json`), "utf8")) as QueueJob
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}
