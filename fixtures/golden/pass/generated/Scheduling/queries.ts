// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetSlotParams = Schema.Struct({
  slotId: Schema.String,
})
export const GetSlot = defineStrictQuery("GetSlot", GetSlotParams, Schema.String)
export type GetSlotQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetSlot["make"]>>
