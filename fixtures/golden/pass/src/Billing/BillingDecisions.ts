import { Effect } from "effect"
import { makeDecision, outcome } from "@rta/core"

type RiskBandOutcome =
  | { readonly _tag: "Low" }
  | { readonly _tag: "Medium" }
  | { readonly _tag: "High" }

export const InvoiceRiskBandDecision = makeDecision<
  { readonly amountCents: number },
  RiskBandOutcome
>("InvoiceRiskBandDecision", (input) => {
  if (input.amountCents >= 20_000) return Effect.succeed(outcome("High"))
  if (input.amountCents >= 5_000) return Effect.succeed(outcome("Medium"))
  return Effect.succeed(outcome("Low"))
})

type ChannelOutcome =
  | { readonly _tag: "Email" }
  | { readonly _tag: "Sms" }
  | { readonly _tag: "Manual" }

export const InvoiceChannelDecision = makeDecision<
  { readonly billingMode: string },
  ChannelOutcome
>("InvoiceChannelDecision", (input) => {
  const mode = input.billingMode.toLowerCase()
  if (mode === "sms") return Effect.succeed(outcome("Sms"))
  if (mode === "manual") return Effect.succeed(outcome("Manual"))
  return Effect.succeed(outcome("Email"))
})
