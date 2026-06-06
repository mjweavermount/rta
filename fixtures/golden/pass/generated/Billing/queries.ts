// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetInvoiceParams = Schema.Struct({
  invoiceId: Schema.String,
})
export const GetInvoice = defineStrictQuery("GetInvoice", GetInvoiceParams, Schema.String)
export type GetInvoiceQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetInvoice["make"]>>
