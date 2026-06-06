// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetInvoiceParams = Schema.Struct({
  invoiceId: Schema.String,
})
export const GetInvoice = defineStrictQuery("GetInvoice", GetInvoiceParams, Schema.String)
export type GetInvoiceQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetInvoice["make"]>>
