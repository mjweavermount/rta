// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
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
