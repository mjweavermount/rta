import { Context, Data, Effect, Layer } from "effect"
import type { ConnectionsDeclaration } from "@rta/vocab"
import type { StrictDomainEvent } from "./message.js"
import { emitPrimitiveLifecycle, subscribePrimitiveLifecycle } from "./lifecycle.js"

// ---------------------------------------------------------------------------
// Event capture bridge
//
// @rta/scenario registers a callback here at module load time.
// makeConnectionMapLayer automatically calls it on every successful publish,
// giving the capture system event payloads without any test-side wiring.
// ---------------------------------------------------------------------------

type EventCaptureCallback = (
  name: string,
  from: string,
  to: string,
  payload: Record<string, unknown> | undefined,
  correlationId: string,
  causationId: string,
  messageId: string,
) => void

/** Called once by @rta/scenario at module load time to wire up auto-capture. */
export function registerEventCaptureCallback(fn: EventCaptureCallback): void {
  subscribePrimitiveLifecycle((event) => {
    if (event.primitiveType !== "event") return
    fn(
      event.primitiveName,
      event.from,
      event.to,
      event.payload,
      event.correlationId,
      event.causationId,
      event.messageId,
    )
  })
}

// ---------------------------------------------------------------------------
// ConnectionViolation error
// ---------------------------------------------------------------------------

export class ConnectionViolation extends Data.TaggedError("ConnectionViolation")<{
  readonly sourceContext: string
  readonly eventTag: string
  readonly targetContext: string
}> {
  override get message() {
    return `${this.sourceContext} is not permitted to publish ${this.eventTag} → ${this.targetContext}`
  }
}

// ---------------------------------------------------------------------------
// ConnectionMap service
//
// Loaded from the connections vocab files at application startup.
// Consulted by strictPublish before any event is routed.
//
// Whitelist semantics: if the route is not explicitly declared, it is denied.
// ---------------------------------------------------------------------------

export interface ConnectionMapService {
  readonly canPublish: (
    sourceContext: string,
    eventTag: string,
    targetContext: string,
  ) => boolean
  readonly canSubscribe: (
    subscriberContext: string,
    eventTag: string,
    publisherContext: string,
  ) => boolean
  /**
   * Optional hook called by strictPublish after a permitted publish.
   * Useful for instrumentation, testing, and dev-time event capture.
   * Not called when the publish is denied (ConnectionViolation).
   */
  readonly onPublish?: (
    event: StrictDomainEvent<string, any>,
    sourceContext: string,
    targetContext: string,
  ) => void
}

export class ConnectionMap extends Context.Tag("@rta/strict/ConnectionMap")<
  ConnectionMap,
  ConnectionMapService
>() {}

/** Build a ConnectionMap Layer from parsed connections declarations. */
export const makeConnectionMapLayer = (
  connections: ReadonlyArray<ConnectionsDeclaration>,
): Layer.Layer<ConnectionMap> =>
  Layer.succeed(ConnectionMap, {
    canPublish: (sourceContext, eventTag, targetContext) => {
      const conn = connections.find((c) => c.context === sourceContext)
      const rule = conn?.publishes?.find((p) => p.event === eventTag)
      return rule?.to.includes(targetContext) ?? false
    },
    canSubscribe: (subscriberContext, eventTag, publisherContext) => {
      const conn = connections.find((c) => c.context === subscriberContext)
      const rule = conn?.subscribes?.find((s) => s.event === eventTag)
      return rule?.from === publisherContext
    },
    onPublish: (event, sourceContext, targetContext) => {
      const payload = event.payload != null && typeof event.payload === "object"
        ? (event.payload as Record<string, unknown>)
        : undefined
      const lifecycleEvent: {
        primitiveType: "event"
        primitiveName: string
        phase: "emitted"
        from: string
        to: string
        payload?: Record<string, unknown>
        correlationId: string
        causationId: string
        messageId: string
      } = {
        primitiveType: "event",
        primitiveName: event._tag,
        phase: "emitted",
        from: sourceContext,
        to: targetContext,
        correlationId: event.correlationId,
        causationId: event.causationId,
        messageId: event.messageId,
      }
      if (payload !== undefined) lifecycleEvent.payload = payload
      emitPrimitiveLifecycle(lifecycleEvent)
    },
  })

// ---------------------------------------------------------------------------
// strictPublish
//
// The only permitted way to "publish" a domain event in @rta/strict.
// Checks the ConnectionMap before returning the event for dispatch.
// Fails with ConnectionViolation if the route is not whitelisted.
//
// This does not perform actual message dispatch — that is the
// infrastructure layer's responsibility. strictPublish is the
// gate that enforces architectural routing rules.
// ---------------------------------------------------------------------------

export const strictPublish = <E extends StrictDomainEvent<string, any>>(
  event: E,
  sourceContext: string,
  targetContext: string,
): Effect.Effect<E, ConnectionViolation, ConnectionMap> =>
  Effect.gen(function* () {
    const map = yield* ConnectionMap
    if (!map.canPublish(sourceContext, event._tag, targetContext)) {
      return yield* Effect.fail(
        new ConnectionViolation({
          sourceContext,
          eventTag: event._tag,
          targetContext,
        }),
      )
    }
    map.onPublish?.(event, sourceContext, targetContext)
    return event
  })
