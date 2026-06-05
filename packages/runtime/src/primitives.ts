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
    return input.queue.enqueue(input)
  }
}

export class RunQueuedScenarioJob extends InstrumentedJob<
  {
    readonly job: QueueJob
    readonly run: (job: QueueJob) => Effect.Effect<unknown, DomainError>
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
      readonly run: (job: QueueJob) => Effect.Effect<unknown, DomainError>
      readonly queue: FileQueue
    },
    scope: OperationScope,
  ): Effect.Effect<QueueJob, DomainError> {
    return Effect.gen(function* () {
      yield* input.queue.update(input.job.id, {
        status: "running",
        startedAt: scope.clock.now().toISOString(),
      })
      const result = yield* Effect.either(input.run(input.job))
      if (result._tag === "Right") {
        return yield* input.queue.update(input.job.id, {
          status: "completed",
          completedAt: scope.clock.now().toISOString(),
          result: result.right,
        })
      }
      const cause = result.left
      return yield* input.queue.update(input.job.id, {
        status: "failed",
        completedAt: scope.clock.now().toISOString(),
        error: cause.message,
      })
    }).pipe(
      Effect.mapError((cause) =>
        cause instanceof DomainError
          ? cause
          : new DomainError({
            message: "queued job execution failed",
            context: { cause: String(cause) },
          })
      ),
    )
  }
}

export class RunQueuedScenarioPromiseJob extends InstrumentedJob<
  {
    readonly job: QueueJob
    readonly run: (job: QueueJob) => Promise<unknown>
    readonly queue: FileQueue
  },
  QueueJob
> {
  constructor() {
    super("RunQueuedScenarioPromiseJob", "Runtime")
  }

  protected summarize(input: { readonly job: QueueJob }): OperationSummary {
    return {
      action: `Run queued promise job ${input.job.id}`,
      reason: "a legacy promise callback should still run through the persistent RTA queue",
      with: [input.job.scenario],
      input: input.job.id,
      output: "completed or failed queue job",
      lineage: ["primitive:job", "runtime:file-queue", "runtime:promise-compat"],
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
    return new RunQueuedScenarioJob().invoke({
      job: input.job,
      queue: input.queue,
      run: (job) =>
        Effect.tryPromise({
          try: () => input.run(job),
          catch: (cause) => new DomainError({
            message: "queued promise job failed",
            context: { cause: String(cause) },
          }),
        }),
    }, scope)
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
    return input.queue.create(input)
  }
}
