// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
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
