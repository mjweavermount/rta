// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
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
