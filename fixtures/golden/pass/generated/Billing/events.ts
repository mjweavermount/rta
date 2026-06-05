// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Schema } from "effect"
import { defineStrictDomainEvent } from "@rta/strict"

export const InvoiceCreatedPayload = Schema.Struct({
  invoiceId: Schema.String,
  slotId: Schema.String,
  amountCents: Schema.String,
})
export const InvoiceCreated = defineStrictDomainEvent("InvoiceCreated", InvoiceCreatedPayload)

export const InvoiceFailedPayload = Schema.Struct({
  invoiceId: Schema.String,
  reason: Schema.String,
})
export const InvoiceFailed = defineStrictDomainEvent("InvoiceFailed", InvoiceFailedPayload)
