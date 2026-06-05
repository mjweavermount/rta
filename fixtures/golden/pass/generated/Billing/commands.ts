// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
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
