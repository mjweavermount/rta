// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetSlotParams = Schema.Struct({
  slotId: Schema.String,
})
export const GetSlot = defineStrictQuery("GetSlot", GetSlotParams, Schema.String)
export type GetSlotQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetSlot["make"]>>
