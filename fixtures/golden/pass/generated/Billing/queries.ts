// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetInvoiceParams = Schema.Struct({
  invoiceId: Schema.String,
})
export const GetInvoice = defineStrictQuery("GetInvoice", GetInvoiceParams, Schema.String)
export type GetInvoiceQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetInvoice["make"]>>
