// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetInvoiceParams = Schema.Struct({
  invoiceId: Schema.String,
})
export const GetInvoice = defineStrictQuery("GetInvoice", GetInvoiceParams, Schema.String)
export type GetInvoiceQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetInvoice["make"]>>
