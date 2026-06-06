// @rta-generated vocab-hash:09ce41eef3b5ca0cbd33460c6cc009aa0eb4f0d53a3262f2ee5dfd249a9c1435
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetInvoiceParams = Schema.Struct({
  invoiceId: Schema.String,
})
export const GetInvoice = defineStrictQuery("GetInvoice", GetInvoiceParams, Schema.String)
export type GetInvoiceQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetInvoice["make"]>>
