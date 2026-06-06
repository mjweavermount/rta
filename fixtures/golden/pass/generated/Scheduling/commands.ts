// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
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
