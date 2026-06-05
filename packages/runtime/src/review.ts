import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Effect } from "effect"
import { RuntimeError, type RuntimeClock } from "./runtime.js"

export type ReviewStatus = "pending" | "approved" | "rejected"

export interface ReviewAuditEntry {
  readonly at: string
  readonly actor: string
  readonly action: string
}

export interface ReviewItem {
  readonly id: string
  readonly runId: string
  readonly title: string
  readonly artifactPath: string
  readonly summary: string
  readonly status: ReviewStatus
  readonly actor: string | null
  readonly decidedAt: string | null
  readonly audit: ReadonlyArray<ReviewAuditEntry>
}

export class ReviewQueue {
  readonly reviewRoot: string

  constructor(
    readonly options: {
      readonly root: string
      readonly clock?: RuntimeClock
    },
  ) {
    this.reviewRoot = join(options.root, ".rta", "reviews")
  }

  ensure(): Effect.Effect<void, RuntimeError> {
    return Effect.tryPromise({
      try: () => mkdir(this.reviewRoot, { recursive: true }),
      catch: (cause) => new RuntimeError("failed to initialize review queue", { cause }),
    }).pipe(Effect.asVoid)
  }

  create(options: {
    readonly runId: string
    readonly title: string
    readonly artifactPath: string
    readonly summary: string
  }): Effect.Effect<ReviewItem, RuntimeError> {
    const item: ReviewItem = {
      id: `review-${options.runId}`,
      runId: options.runId,
      title: options.title,
      artifactPath: options.artifactPath,
      summary: options.summary,
      status: "pending",
      actor: null,
      decidedAt: null,
      audit: [{ at: this.nowIso(), actor: "system", action: "created" }],
    }
    return this.write(item).pipe(Effect.as(item))
  }

  show(id: string): Effect.Effect<ReviewItem, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => JSON.parse(await readFile(join(this.reviewRoot, `${id}.json`), "utf8")) as ReviewItem,
          catch: (cause) => new RuntimeError("failed to read review item", { id, cause }),
        }),
      ),
    )
  }

  decide(id: string, options: {
    readonly status: Exclude<ReviewStatus, "pending">
    readonly actor: string
  }): Effect.Effect<ReviewItem, RuntimeError> {
    return this.show(id).pipe(
      Effect.flatMap((item) => {
        const updated: ReviewItem = {
          ...item,
          status: options.status,
          actor: options.actor,
          decidedAt: this.nowIso(),
          audit: [
            ...item.audit,
            { at: this.nowIso(), actor: options.actor, action: options.status },
          ],
        }
        return this.write(updated).pipe(Effect.as(updated))
      }),
    )
  }

  write(item: ReviewItem): Effect.Effect<void, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => writeFile(join(this.reviewRoot, `${item.id}.json`), JSON.stringify(item, null, 2), "utf8"),
          catch: (cause) => new RuntimeError("failed to write review item", { id: item.id, cause }),
        }),
      ),
    )
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}
