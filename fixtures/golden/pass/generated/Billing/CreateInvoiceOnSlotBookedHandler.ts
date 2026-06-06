// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
import { Effect } from "effect"
import { DomainError, type DomainEvent } from "@rta/core"
import { InstrumentedEventHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"

// ---------------------------------------------------------------------------
// CreateInvoiceOnSlotBooked event handler
// ---------------------------------------------------------------------------

export type CreateInvoiceOnSlotBookedEvent = DomainEvent<string, unknown>

export class CreateInvoiceOnSlotBookedHandler extends InstrumentedEventHandler<CreateInvoiceOnSlotBookedEvent, DomainError> {
  constructor() {
    super("CreateInvoiceOnSlotBookedHandler", "Billing")
  }

  protected summarizeEvent(event: CreateInvoiceOnSlotBookedEvent): OperationSummary {
    return {
      action: "React to SlotBooked",
      reason: "Create an invoice whenever Scheduling emits SlotBooked.",
      with: ["Billing.CreateInvoice"],
      input: event._tag,
      output: "declared reaction commands evaluated",
      lineage: ["context:Billing", "reaction:CreateInvoiceOnSlotBooked", "trigger:SlotBooked"],
    }
  }

  protected executeEvent(
    event: CreateInvoiceOnSlotBookedEvent,
    _scope: OperationScope,
  ): Effect.Effect<void, DomainError> {
    void event
    // TODO: map the event payload into these declared command outputs:
    // - Billing.CreateInvoice
    // Pattern: yield* commandBus.dispatch(Command.make(...), _scope.fork("CreateInvoiceOnSlotBooked"))
    return Effect.void
  }
}

export const handleCreateInvoiceOnSlotBooked = (
  event: CreateInvoiceOnSlotBookedEvent,
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
  new CreateInvoiceOnSlotBookedHandler().handle(event, scope)
