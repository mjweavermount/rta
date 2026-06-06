// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
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
