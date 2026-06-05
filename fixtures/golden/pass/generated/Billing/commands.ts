// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
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
