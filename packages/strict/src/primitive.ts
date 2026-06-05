import { Effect } from "effect"
import type {
  Command,
  DomainError,
  DomainEvent,
  OperationScope,
  Query,
  QueryResult,
} from "@rta/core"
import {
  emitPrimitiveLifecycle,
  type GenericPrimitiveLifecycleEvent,
  type PrimitiveOperationSummary,
} from "./lifecycle.js"

export type OperationSummary = PrimitiveOperationSummary

export type InstrumentedPrimitiveKind = GenericPrimitiveLifecycleEvent["primitiveType"]

export abstract class InstrumentedPrimitive<
  I,
  O,
  E = DomainError,
> {
  protected constructor(
    readonly primitiveType: InstrumentedPrimitiveKind,
    readonly primitiveName: string,
    readonly context: string,
  ) {}

  readonly invoke = (input: I, scope: OperationScope): Effect.Effect<O, E> => {
    const summary = this.summarize(input, scope)
    this.emitPhase("received", scope, summary)
    this.emitPhase("started", scope, summary)

    return this.execute(input, scope).pipe(
      Effect.tap((output) =>
        Effect.sync(() => {
          this.emitPhase("completed", scope, this.summarizeOutput(input, output, scope, summary))
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.emitPhase("failed", scope, this.summarizeFailure(input, error, scope, summary))
        }).pipe(Effect.flatMap(() => Effect.fail(error))),
      ),
    )
  }

  protected summarize(_input: I, _scope: OperationScope): OperationSummary {
    return {
      action: `Invoke ${this.primitiveName}`,
      reason: `${this.primitiveType} ${this.primitiveName} was invoked`,
      with: [this.context],
    }
  }

  protected summarizeOutput(
    _input: I,
    _output: O,
    _scope: OperationScope,
    summary: OperationSummary,
  ): OperationSummary {
    return summary
  }

  protected summarizeFailure(
    _input: I,
    error: E,
    _scope: OperationScope,
    summary: OperationSummary,
  ): OperationSummary {
    return {
      ...summary,
      output: `failed: ${String(error)}`,
    }
  }

  protected abstract execute(input: I, scope: OperationScope): Effect.Effect<O, E>

  private emitPhase(
    phase: GenericPrimitiveLifecycleEvent["phase"],
    scope: OperationScope,
    summary: OperationSummary,
  ): void {
    emitPrimitiveLifecycle({
      primitiveType: this.primitiveType,
      primitiveName: this.primitiveName,
      phase,
      context: this.context,
      correlationId: scope.traceId,
      causationId: scope.operationId,
      messageId: scope.spanId,
      summary,
    })
  }
}

export abstract class InstrumentedInboundAdapter<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("inbound-adapter", primitiveName, context)
  }
}

export abstract class InstrumentedOutboundAdapter<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("outbound-adapter", primitiveName, context)
  }
}

export abstract class InstrumentedBoundedContext<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("bounded-context", primitiveName, context)
  }
}

export abstract class InstrumentedScheduler<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("scheduler", primitiveName, context)
  }
}

export abstract class InstrumentedJob<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("job", primitiveName, context)
  }
}

export abstract class InstrumentedProjector<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("projector", primitiveName, context)
  }
}

export abstract class InstrumentedRepository<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("repository", primitiveName, context)
  }
}

export abstract class InstrumentedEdgeBoundary<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("edge-boundary", primitiveName, context)
  }
}

export abstract class InstrumentedSecret<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("secret", primitiveName, context)
  }
}

export abstract class InstrumentedPolicy<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("policy", primitiveName, context)
  }
}

export abstract class InstrumentedGuardrail<I, O, E = DomainError>
  extends InstrumentedPrimitive<I, O, E> {
  protected constructor(primitiveName: string, context: string) {
    super("guardrail", primitiveName, context)
  }
}

export abstract class InstrumentedCommandHandler<
  C extends Command<string, any>,
  E = DomainError,
  R = never,
> {
  protected constructor(
    readonly primitiveName: string,
    readonly context: string,
  ) {}

  readonly handle = (command: C, scope: OperationScope): Effect.Effect<void, E, R> => {
    const summary = this.summarizeCommand(command, scope)
    emitPrimitiveLifecycle({
      primitiveType: "command-handler",
      primitiveName: this.primitiveName,
      phase: "received",
      messageTag: command._tag,
      context: this.context,
      correlationId: scope.traceId,
      causationId: scope.operationId,
      messageId: scope.spanId,
      summary,
    })
    emitPrimitiveLifecycle({
      primitiveType: "command-handler",
      primitiveName: this.primitiveName,
      phase: "started",
      messageTag: command._tag,
      context: this.context,
      correlationId: scope.traceId,
      causationId: scope.operationId,
      messageId: scope.spanId,
      summary,
    })

    return this.executeCommand(command, scope).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "command-handler",
            primitiveName: this.primitiveName,
            phase: "completed",
            messageTag: command._tag,
            context: this.context,
            correlationId: scope.traceId,
            causationId: scope.operationId,
            messageId: scope.spanId,
            summary,
          })
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "command-handler",
            primitiveName: this.primitiveName,
            phase: "failed",
            messageTag: command._tag,
            context: this.context,
            correlationId: scope.traceId,
            causationId: scope.operationId,
            messageId: scope.spanId,
            summary,
          })
        }).pipe(Effect.flatMap(() => Effect.fail(error))),
      ),
    )
  }

  protected summarizeCommand(command: C, _scope: OperationScope): OperationSummary {
    return {
      action: command._tag,
      reason: `command ${command._tag} received by ${this.primitiveName}`,
      with: [this.context],
    }
  }

  protected abstract executeCommand(
    command: C,
    scope: OperationScope,
  ): Effect.Effect<void, E, R>
}

export abstract class InstrumentedQueryHandler<
  Q extends Query<string, any, any>,
  E = DomainError,
  R = never,
> {
  protected constructor(
    readonly primitiveName: string,
    readonly context: string,
  ) {}

  readonly handle = (
    query: Q,
    scope: OperationScope,
  ): Effect.Effect<QueryResult<Q>, E, R> => {
    const summary = this.summarizeQuery(query, scope)
    emitPrimitiveLifecycle({
      primitiveType: "query-handler",
      primitiveName: this.primitiveName,
      phase: "received",
      messageTag: query._tag,
      context: this.context,
      correlationId: scope.traceId,
      summary,
    })
    emitPrimitiveLifecycle({
      primitiveType: "query-handler",
      primitiveName: this.primitiveName,
      phase: "started",
      messageTag: query._tag,
      context: this.context,
      correlationId: scope.traceId,
      summary,
    })

    return this.executeQuery(query, scope).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "query-handler",
            primitiveName: this.primitiveName,
            phase: "completed",
            messageTag: query._tag,
            context: this.context,
            correlationId: scope.traceId,
            summary,
          })
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "query-handler",
            primitiveName: this.primitiveName,
            phase: "failed",
            messageTag: query._tag,
            context: this.context,
            correlationId: scope.traceId,
            summary,
          })
        }).pipe(Effect.flatMap(() => Effect.fail(error))),
      ),
    )
  }

  protected summarizeQuery(query: Q, _scope: OperationScope): OperationSummary {
    return {
      action: query._tag,
      reason: `query ${query._tag} received by ${this.primitiveName}`,
      with: [this.context],
    }
  }

  protected abstract executeQuery(
    query: Q,
    scope: OperationScope,
  ): Effect.Effect<QueryResult<Q>, E, R>
}

export abstract class InstrumentedEventHandler<
  Ev extends DomainEvent<string, any>,
  E = DomainError,
  R = never,
> {
  protected constructor(
    readonly primitiveName: string,
    readonly context: string,
  ) {}

  readonly handle = (event: Ev, scope: OperationScope): Effect.Effect<void, E, R> => {
    const summary = this.summarizeEvent(event, scope)
    const correlationId = messageField(event, "correlationId") ?? scope.traceId
    const causationId = messageField(event, "causationId") ?? scope.operationId
    const messageId = messageField(event, "messageId") ?? scope.spanId
    emitPrimitiveLifecycle({
      primitiveType: "event-handler",
      primitiveName: this.primitiveName,
      phase: "received",
      messageTag: event._tag,
      context: this.context,
      correlationId,
      causationId,
      messageId,
      summary,
    })
    emitPrimitiveLifecycle({
      primitiveType: "event-handler",
      primitiveName: this.primitiveName,
      phase: "started",
      messageTag: event._tag,
      context: this.context,
      correlationId,
      causationId,
      messageId,
      summary,
    })

    return this.executeEvent(event, scope).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "event-handler",
            primitiveName: this.primitiveName,
            phase: "completed",
            messageTag: event._tag,
            context: this.context,
            correlationId,
            causationId,
            messageId,
            summary,
          })
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "event-handler",
            primitiveName: this.primitiveName,
            phase: "failed",
            messageTag: event._tag,
            context: this.context,
            correlationId,
            causationId,
            messageId,
            summary: this.summarizeEventFailure(event, error, scope, summary),
          })
        }).pipe(Effect.flatMap(() => Effect.fail(error))),
      ),
    )
  }

  protected summarizeEvent(event: Ev, _scope: OperationScope): OperationSummary {
    return {
      action: event._tag,
      reason: `event ${event._tag} received by ${this.primitiveName}`,
      with: [this.context],
    }
  }

  protected summarizeEventFailure(
    _event: Ev,
    error: E,
    _scope: OperationScope,
    summary: OperationSummary,
  ): OperationSummary {
    return {
      ...summary,
      output: `failed: ${String(error)}`,
    }
  }

  protected abstract executeEvent(
    event: Ev,
    scope: OperationScope,
  ): Effect.Effect<void, E, R>
}

const messageField = (event: unknown, field: string): string | undefined => {
  if (event == null || typeof event !== "object") return undefined
  const value = (event as Record<string, unknown>)[field]
  return typeof value === "string" ? value : undefined
}
