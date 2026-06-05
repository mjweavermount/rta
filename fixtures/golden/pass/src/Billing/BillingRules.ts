import { Effect } from "effect"
import { makeRule, ruleViolation, type Rule } from "@rta/core"

type InvoiceDraft = {
  readonly amountCents: number
}

export const InvoiceAmountMustBePositive: Rule<
  InvoiceDraft,
  "InvoiceAmountInvalid"
> = makeRule("InvoiceAmountMustBePositive", (invoice) =>
  invoice.amountCents <= 0
    ? Effect.fail(
        ruleViolation(
          "InvoiceAmountInvalid",
          "InvoiceAmountMustBePositive",
          "amount must be positive",
        ),
      )
    : Effect.void,
)
