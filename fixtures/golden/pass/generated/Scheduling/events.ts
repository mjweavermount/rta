// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
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
