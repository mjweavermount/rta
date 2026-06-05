// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Schema } from "effect"
import { defineStrictDomainEvent } from "@rta/strict"

export const SlotOpenedPayload = Schema.Struct({
  slotId: Schema.String,
})
export const SlotOpened = defineStrictDomainEvent("SlotOpened", SlotOpenedPayload)

export const SlotBookedPayload = Schema.Struct({
  slotId: Schema.String,
  bookingId: Schema.String,
})
export const SlotBooked = defineStrictDomainEvent("SlotBooked", SlotBookedPayload)

export const SlotReleasedPayload = Schema.Struct({
  slotId: Schema.String,
})
export const SlotReleased = defineStrictDomainEvent("SlotReleased", SlotReleasedPayload)
