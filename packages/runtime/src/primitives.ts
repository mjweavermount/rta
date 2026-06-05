import { Effect } from "effect"
import { DomainError, type OperationScope } from "@rta/core"
import {
  InstrumentedJob,
  InstrumentedPolicy,
  InstrumentedScheduler,
  type OperationSummary,
} from "@rta/strict"
import type { FileQueue, QueueJob } from "./queue.js"
import type { ReviewItem, ReviewQueue } from "./review.js"

export class EnqueueScenarioJob extends InstrumentedScheduler<
  {
    readonly queue: FileQueue
    readonly scenario: string
    readonly input?: unknown
    readonly review?: boolean
    readonly verbosity?: "normal" | "high" | "trace"
    readonly high?: boolean
  },
  QueueJob
> {
  constructor() {
    super("EnqueueScenarioJob", "Runtime")
  }

  protected summarize(input: { readonly scenario: string }): OperationSummary {
    return {
      action: `Enqueue ${input.scenario}`,
      reason: "a scenario should run through the persistent RTA queue",
      with: ["FileQueue"],
      input: input.scenario,
      output: "queued job",
      lineage: ["primitive:scheduler", "runtime:file-queue"],
    }
  }

  protected execute(input: {
    readonly queue: FileQueue
    readonly scenario: string
    readonly input?: unknown
    readonly review?: boolean
    readonly verbosity?: "normal" | "high" | "trace"
    readonly high?: boolean
  }): Effect.Effect<QueueJob, DomainError> {
    return Effect.sync(() => input.queue.enqueue(input))
  }
}

export class RunQueuedScenarioJob extends InstrumentedJob<
  {
    readonly job: QueueJob
    readonly run: (job: QueueJob) => Promise<unknown>
    readonly queue: FileQueue
  },
  QueueJob
> {
  constructor() {
    super("RunQueuedScenarioJob", "Runtime")
  }

  protected summarize(input: { readonly job: QueueJob }): OperationSummary {
    return {
      action: `Run queued job ${input.job.id}`,
      reason: "the scheduler claimed the next queued scenario job",
      with: [input.job.scenario],
      input: input.job.id,
      output: "completed or failed queue job",
      lineage: ["primitive:job", "runtime:file-queue"],
    }
  }

  protected execute(
    input: {
      readonly job: QueueJob
      readonly run: (job: QueueJob) => Promise<unknown>
      readonly queue: FileQueue
    },
    scope: OperationScope,
  ): Effect.Effect<QueueJob, DomainError> {
    return Effect.tryPromise({
      try: async () => {
        input.queue.update(input.job.id, {
          status: "running",
          startedAt: scope.clock.now().toISOString(),
        })
        try {
          const result = await input.run(input.job)
          return input.queue.update(input.job.id, {
            status: "completed",
            completedAt: scope.clock.now().toISOString(),
            result,
          })
        } catch (cause) {
          const error = cause instanceof Error ? cause : new Error(String(cause))
          return input.queue.update(input.job.id, {
            status: "failed",
            completedAt: scope.clock.now().toISOString(),
            error: error.message,
          })
        }
      },
      catch: (cause) => new DomainError({
        message: "queued job execution failed",
        context: { cause: String(cause) },
      }),
    })
  }
}

export class CreateReviewItem extends InstrumentedPolicy<
  {
    readonly queue: ReviewQueue
    readonly runId: string
    readonly title: string
    readonly artifactPath: string
    readonly summary: string
  },
  ReviewItem
> {
  constructor() {
    super("CreateReviewItem", "Runtime")
  }

  protected summarize(input: { readonly runId: string; readonly title: string }): OperationSummary {
    return {
      action: `Create review ${input.title}`,
      reason: "external publication requires human QA/demo review",
      with: ["ReviewQueue"],
      input: input.runId,
      output: "pending review item",
      lineage: ["primitive:policy", "runtime:review-queue"],
    }
  }

  protected execute(input: {
    readonly queue: ReviewQueue
    readonly runId: string
    readonly title: string
    readonly artifactPath: string
    readonly summary: string
  }): Effect.Effect<ReviewItem, DomainError> {
    return Effect.sync(() => input.queue.create(input))
  }
}
