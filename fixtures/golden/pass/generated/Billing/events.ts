// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
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
