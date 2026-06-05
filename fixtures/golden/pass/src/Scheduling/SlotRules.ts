import { Effect } from "effect"
import { makeRule, ruleViolation, type Rule } from "@rta/core"

type Slot = {
  readonly data: {
    readonly status: "open" | "booked" | "released"
    readonly bookingId?: string
  }
}

export const SlotMustBeOpen: Rule<Slot, "SlotNotOpen"> = makeRule(
  "SlotMustBeOpen",
  (slot) =>
    slot.data.status !== "open"
      ? Effect.fail(ruleViolation("SlotNotOpen", "SlotMustBeOpen"))
      : Effect.void,
)

export const SlotNotAlreadyBooked: Rule<Slot, "SlotAlreadyBooked"> = makeRule(
  "SlotNotAlreadyBooked",
  (slot) =>
    slot.data.bookingId
      ? Effect.fail(ruleViolation("SlotAlreadyBooked", "SlotNotAlreadyBooked"))
      : Effect.void,
)
