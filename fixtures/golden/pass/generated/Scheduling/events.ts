// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
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
