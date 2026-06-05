import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { RuntimeClock } from "./runtime.js"

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
    mkdirSync(this.reviewRoot, { recursive: true })
  }

  create(options: {
    readonly runId: string
    readonly title: string
    readonly artifactPath: string
    readonly summary: string
  }): ReviewItem {
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
    this.write(item)
    return item
  }

  show(id: string): ReviewItem {
    return JSON.parse(readFileSync(join(this.reviewRoot, `${id}.json`), "utf8")) as ReviewItem
  }

  decide(id: string, options: { readonly status: Exclude<ReviewStatus, "pending">; readonly actor: string }): ReviewItem {
    const item = this.show(id)
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
    this.write(updated)
    return updated
  }

  write(item: ReviewItem): void {
    writeFileSync(join(this.reviewRoot, `${item.id}.json`), JSON.stringify(item, null, 2))
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}
