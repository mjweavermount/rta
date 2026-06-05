import { Effect } from "effect"
import { makeReaction } from "@rta/core"

type SlotBookedEvent = {
  readonly _tag: "SlotBooked"
  readonly payload: {
    readonly slotId: string
    readonly bookingId: string
  }
}

type InvoiceFailedEvent = {
  readonly _tag: "InvoiceFailed"
  readonly payload: {
    readonly invoiceId: string
    readonly reason: string
  }
}

type CreateInvoiceCommand = {
  readonly _tag: "CreateInvoice"
  readonly slotId: string
  readonly amountCents: number
}

type ReleaseSlotCommand = {
  readonly _tag: "ReleaseSlot"
  readonly slotId: string
}

export const CreateInvoiceOnSlotBooked = makeReaction<
  SlotBookedEvent,
  CreateInvoiceCommand
>("CreateInvoiceOnSlotBooked", "SlotBooked", (event) =>
  Effect.succeed([
    {
      _tag: "CreateInvoice",
      slotId: event.payload.slotId,
      amountCents: 7500,
    },
  ]),
)

export const ReleaseSlotOnInvoiceFailed = makeReaction<
  InvoiceFailedEvent,
  ReleaseSlotCommand
>("ReleaseSlotOnInvoiceFailed", "InvoiceFailed", (event) =>
  Effect.succeed([
    {
      _tag: "ReleaseSlot",
      slotId: event.payload.invoiceId,
    },
  ]),
)
