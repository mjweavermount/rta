// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
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
