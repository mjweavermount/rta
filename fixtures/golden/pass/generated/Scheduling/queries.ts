// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
import { Schema } from "effect"
import { defineStrictQuery } from "@rta/strict"

export const GetSlotParams = Schema.Struct({
  slotId: Schema.String,
})
export const GetSlot = defineStrictQuery("GetSlot", GetSlotParams, Schema.String)
export type GetSlotQuery = import("effect").Effect.Effect.Success<ReturnType<typeof GetSlot["make"]>>
