// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
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
