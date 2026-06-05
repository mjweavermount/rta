// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetSlotParams = Schema.Struct({
  slotId: Schema.String,
})
export const GetSlot = defineStrictQuery("GetSlot", GetSlotParams, Schema.String)
export type GetSlotQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetSlot["make"]>>
