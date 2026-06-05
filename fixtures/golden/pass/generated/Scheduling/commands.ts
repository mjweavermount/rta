// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
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
