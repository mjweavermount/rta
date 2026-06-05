import { Effect } from "effect"
import { makeDecision, outcome } from "@rta/core"

interface SlotLifecycleInput {
  readonly status: "open" | "booked" | "released"
}

type SlotLifecycleOutcome =
  | { readonly _tag: "open" }
  | { readonly _tag: "booked" }
  | { readonly _tag: "released" }

export const SlotLifecycleDecision = makeDecision<
  SlotLifecycleInput,
  SlotLifecycleOutcome
>(
  "SlotLifecycleDecision",
  (input) => {
    if (input.status === "booked") return Effect.succeed(outcome("booked"))
    if (input.status === "released") return Effect.succeed(outcome("released"))
    return Effect.succeed(outcome("open"))
  },
)
