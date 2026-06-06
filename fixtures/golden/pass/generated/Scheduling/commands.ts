// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
import { Schema } from "effect"
import { defineStrictCommand } from "@rta/strict"

export const OpenSlotPayload = Schema.Struct({
  startTime: Schema.String,
})
export const OpenSlot = defineStrictCommand("OpenSlot", OpenSlotPayload)
export type OpenSlotCommand = import("effect").Effect.Effect.Success<ReturnType<typeof OpenSlot["make"]>>

export const BookSlotPayload = Schema.Struct({
  slotId: Schema.String,
  bookingId: Schema.String,
})
export const BookSlot = defineStrictCommand("BookSlot", BookSlotPayload)
export type BookSlotCommand = import("effect").Effect.Effect.Success<ReturnType<typeof BookSlot["make"]>>

export const ReleaseSlotPayload = Schema.Struct({
  slotId: Schema.String,
})
export const ReleaseSlot = defineStrictCommand("ReleaseSlot", ReleaseSlotPayload)
export type ReleaseSlotCommand = import("effect").Effect.Effect.Success<ReturnType<typeof ReleaseSlot["make"]>>
