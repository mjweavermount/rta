// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
import { Schema } from "effect"
import { defineStrictCommand } from "@rta/strict"

export const CreateInvoicePayload = Schema.Struct({
  slotId: Schema.String,
  amountCents: Schema.String,
})
export const CreateInvoice = defineStrictCommand("CreateInvoice", CreateInvoicePayload)
export type CreateInvoiceCommand = import("effect").Effect.Effect.Success<ReturnType<typeof CreateInvoice["make"]>>

export const FailInvoicePayload = Schema.Struct({
  invoiceId: Schema.String,
  reason: Schema.String,
})
export const FailInvoice = defineStrictCommand("FailInvoice", FailInvoicePayload)
export type FailInvoiceCommand = import("effect").Effect.Effect.Success<ReturnType<typeof FailInvoice["make"]>>
