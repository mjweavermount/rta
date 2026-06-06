// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
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
