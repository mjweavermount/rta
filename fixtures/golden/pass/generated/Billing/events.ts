// @rta-generated vocab-hash:09ce41eef3b5ca0cbd33460c6cc009aa0eb4f0d53a3262f2ee5dfd249a9c1435
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
