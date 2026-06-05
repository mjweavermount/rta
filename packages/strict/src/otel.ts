import { Effect } from "effect"
import type { CommandHandler, EventHandler, QueryHandler } from "@rta/core"
import { emitPrimitiveLifecycle } from "./lifecycle.js"
import type { StrictCommand, StrictDomainEvent, StrictQuery } from "./message.js"
import {
  projectValidatedCommandHandlerSpan,
  projectValidatedEventHandlerSpan,
  projectValidatedQueryHandlerSpan,
} from "./projection.js"

// ---------------------------------------------------------------------------
// OTEL handler wrappers
//
// Wraps @rta/core handlers with Effect.withSpan. The span name follows
// OpenTelemetry messaging semantics. Correlation and causation IDs are
// attached as span attributes for distributed trace correlation.
//
// The actual tracer backend (OTEL SDK, no-op, test tracer) is injected via
// Effect's Tracer service in the application's Layer — @rta/strict does not
// bind to any specific backend.
// ---------------------------------------------------------------------------

/**
 * Wrap a CommandHandler with an OTEL span.
 * Span name: "cmd.<Tag>"
 * Attributes: command tag, correlation/causation IDs, issuedBy actor.
 */
export const withOtelCommandHandler = <C extends StrictCommand<string, any>>(
  handler: CommandHandler<C>,
  options?: { readonly context?: string; readonly name?: string },
): CommandHandler<C> => ({
  ...handler,
  handle: (command) => {
    const context = options?.context ?? "unknown"
    const primitiveName = options?.name ?? command._tag
    const span = projectValidatedCommandHandlerSpan(command)
    emitPrimitiveLifecycle({
      primitiveType: "command-handler",
      primitiveName,
      phase: "received",
      messageTag: command._tag,
      context,
      correlationId: command.correlationId,
      causationId: command.causationId,
      messageId: command.messageId,
    })
    return Effect.sync(() => {
      emitPrimitiveLifecycle({
        primitiveType: "command-handler",
        primitiveName,
        phase: "started",
        messageTag: command._tag,
        context,
        correlationId: command.correlationId,
        causationId: command.causationId,
        messageId: command.messageId,
      })
    }).pipe(
      Effect.zipRight(handler.handle(command)),
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "command-handler",
            primitiveName,
            phase: "completed",
            messageTag: command._tag,
            context,
            correlationId: command.correlationId,
            causationId: command.causationId,
            messageId: command.messageId,
          })
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "command-handler",
            primitiveName,
            phase: "failed",
            messageTag: command._tag,
            context,
            correlationId: command.correlationId,
            causationId: command.causationId,
            messageId: command.messageId,
          })
          void error
        }),
      ),
      Effect.withSpan(span.name, { attributes: span.attributes }),
    )
  },
})

/**
 * Wrap a QueryHandler with an OTEL span.
 * Span name: "query.<Tag>"
 * Attributes: query tag, correlation ID, issuedBy actor.
 */
export const withOtelQueryHandler = <Q extends StrictQuery<string, any, any>>(
  handler: QueryHandler<Q>,
  options?: { readonly context?: string; readonly name?: string },
): QueryHandler<Q> => ({
  ...handler,
  handle: (query) => {
    const context = options?.context ?? "unknown"
    const primitiveName = options?.name ?? query._tag
    const span = projectValidatedQueryHandlerSpan(query)
    emitPrimitiveLifecycle({
      primitiveType: "query-handler",
      primitiveName,
      phase: "received",
      messageTag: query._tag,
      context,
      correlationId: query.correlationId,
    })
    return Effect.sync(() => {
      emitPrimitiveLifecycle({
        primitiveType: "query-handler",
        primitiveName,
        phase: "started",
        messageTag: query._tag,
        context,
        correlationId: query.correlationId,
      })
    }).pipe(
      Effect.zipRight(handler.handle(query)),
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "query-handler",
            primitiveName,
            phase: "completed",
            messageTag: query._tag,
            context,
            correlationId: query.correlationId,
          })
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "query-handler",
            primitiveName,
            phase: "failed",
            messageTag: query._tag,
            context,
            correlationId: query.correlationId,
          })
          void error
        }),
      ),
      Effect.withSpan(span.name, { attributes: span.attributes }),
    )
  },
})

/**
 * Wrap an EventHandler with an OTEL span.
 * Span name: "event.<Tag>"
 * Attributes: event tag, correlation/causation IDs, aggregate provenance.
 */
export const withOtelEventHandler = <E extends StrictDomainEvent<string, any>>(
  handler: EventHandler<E>,
  options?: { readonly context?: string; readonly name?: string },
): EventHandler<E> => ({
  ...handler,
  handle: (event) => {
    const context = options?.context ?? "unknown"
    const primitiveName = options?.name ?? event._tag
    const span = projectValidatedEventHandlerSpan(event)
    emitPrimitiveLifecycle({
      primitiveType: "event-handler",
      primitiveName,
      phase: "received",
      messageTag: event._tag,
      context,
      correlationId: event.correlationId,
      causationId: event.causationId,
      messageId: event.messageId,
    })
    return Effect.sync(() => {
      emitPrimitiveLifecycle({
        primitiveType: "event-handler",
        primitiveName,
        phase: "started",
        messageTag: event._tag,
        context,
        correlationId: event.correlationId,
        causationId: event.causationId,
        messageId: event.messageId,
      })
    }).pipe(
      Effect.zipRight(handler.handle(event)),
      Effect.tap(() =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "event-handler",
            primitiveName,
            phase: "completed",
            messageTag: event._tag,
            context,
            correlationId: event.correlationId,
            causationId: event.causationId,
            messageId: event.messageId,
          })
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          emitPrimitiveLifecycle({
            primitiveType: "event-handler",
            primitiveName,
            phase: "failed",
            messageTag: event._tag,
            context,
            correlationId: event.correlationId,
            causationId: event.causationId,
            messageId: event.messageId,
          })
          void error
        }),
      ),
      Effect.withSpan(span.name, { attributes: span.attributes }),
    )
  },
})
