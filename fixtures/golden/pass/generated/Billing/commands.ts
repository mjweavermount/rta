// @rta-generated vocab-hash:09ce41eef3b5ca0cbd33460c6cc009aa0eb4f0d53a3262f2ee5dfd249a9c1435
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
