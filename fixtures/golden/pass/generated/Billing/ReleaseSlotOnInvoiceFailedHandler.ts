// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
import { Effect } from "effect"
import { DomainError, type DomainEvent } from "@rta/core"
import { InstrumentedEventHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"

// ---------------------------------------------------------------------------
// ReleaseSlotOnInvoiceFailed event handler
// ---------------------------------------------------------------------------

export type ReleaseSlotOnInvoiceFailedEvent = DomainEvent<string, unknown>

export class ReleaseSlotOnInvoiceFailedHandler extends InstrumentedEventHandler<ReleaseSlotOnInvoiceFailedEvent, DomainError> {
  constructor() {
    super("ReleaseSlotOnInvoiceFailedHandler", "Billing")
  }

  protected summarizeEvent(event: ReleaseSlotOnInvoiceFailedEvent): OperationSummary {
    return {
      action: "React to InvoiceFailed",
      reason: "Release the slot when an invoice fails.",
      with: ["Scheduling.ReleaseSlot"],
      input: event._tag,
      output: "declared reaction commands evaluated",
      lineage: ["context:Billing", "reaction:ReleaseSlotOnInvoiceFailed", "trigger:InvoiceFailed"],
    }
  }

  protected executeEvent(
    event: ReleaseSlotOnInvoiceFailedEvent,
    _scope: OperationScope,
  ): Effect.Effect<void, DomainError> {
    void event
    // TODO: map the event payload into these declared command outputs:
    // - Scheduling.ReleaseSlot
    // Pattern: yield* commandBus.dispatch(Command.make(...), _scope.fork("ReleaseSlotOnInvoiceFailed"))
    return Effect.void
  }
}

export const handleReleaseSlotOnInvoiceFailed = (
  event: ReleaseSlotOnInvoiceFailedEvent,
  scope = new OperationScope({
    traceId: event._tag,
    operationId: event._tag,
    spanId: event._tag,
    trustLevel: "internal",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => event._tag },
  }),
): Effect.Effect<void, DomainError> =>
  new ReleaseSlotOnInvoiceFailedHandler().handle(event, scope)
