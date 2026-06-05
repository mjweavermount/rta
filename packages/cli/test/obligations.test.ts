import { describe, expect, it } from "vitest"
import { readVocabFile } from "@rta/vocab"
import { Effect } from "effect"
import { resolve } from "node:path"
import {
  deriveContextObligations,
  deriveConnectionsObligations,
  deriveDecisionObligations,
  deriveProcessManagerObligations,
  deriveReactionObligations,
  deriveRuleObligations,
  formatObligationMarker,
} from "../src/obligations.js"

const fixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/contexts/order-management-with-logic.context.yaml",
)
const connectionsFixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/connections/order-management-with-reactions.connections.yaml",
)

describe("obligations", () => {
  it("derives baseline and shape obligations for rules", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    expect(parsed.kind).toBe("BoundedContext")
    if (parsed.kind !== "BoundedContext") return

    const order = parsed.aggregates?.[0]
    const mustHaveItems = order?.rules?.[0]
    const customerNotSuspended = order?.rules?.[1]
    expect(mustHaveItems).toBeDefined()
    expect(customerNotSuspended).toBeDefined()
    if (!order || !mustHaveItems || !customerNotSuspended) return

    const predicateObligations = deriveRuleObligations(parsed.name, order.name, mustHaveItems)
    const preconditionObligations = deriveRuleObligations(parsed.name, order.name, customerNotSuspended)

    expect(predicateObligations.map((item) => item.id)).toEqual([
      "rule:OrderManagement.Order.OrderMustHaveItems:pass-case",
      "rule:OrderManagement.Order.OrderMustHaveItems:fail-case",
    ])
    expect(preconditionObligations.map((item) => item.id)).toContain(
      "rule:OrderManagement.Order.CustomerNotSuspended:valid-pre-state",
    )
    expect(preconditionObligations.map((item) => item.id)).toContain(
      "rule:OrderManagement.Order.CustomerNotSuspended:wrong-state",
    )
  })

  it("derives outcome, shape, and pattern obligations for decisions", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const pricing = parsed.decisions?.[0]
    const eligibility = parsed.decisions?.[1]
    expect(pricing).toBeDefined()
    expect(eligibility).toBeDefined()
    if (!pricing || !eligibility) return

    const pricingObligations = deriveDecisionObligations(parsed.name, pricing)
    const eligibilityObligations = deriveDecisionObligations(parsed.name, eligibility)

    expect(pricingObligations.map((item) => item.id)).toContain(
      "decision:OrderManagement.PricingTierDecision:outcome:Premium",
    )
    expect(pricingObligations.map((item) => item.id)).toContain(
      "decision:OrderManagement.PricingTierDecision:bucket-boundaries",
    )
    expect(eligibilityObligations.map((item) => item.id)).toContain(
      "decision:OrderManagement.OrderEligibilityDecision:first-match-ordering",
    )
  })

  it("derives a full context obligation list and formats markers", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const obligations = deriveContextObligations(parsed)
    expect(obligations.length).toBeGreaterThan(0)
    expect(formatObligationMarker(obligations[0]!.id)).toMatch(/^@rta-obligation /)
  })

  it("derives process manager obligations from trigger, transitions, and terminal states", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const pm = parsed.processManagers?.[0]
    expect(pm).toBeDefined()
    if (!pm) return

    const obligations = deriveProcessManagerObligations(parsed.name, pm)
    expect(obligations.map((item) => item.id)).toContain(
      "process-manager:OrderManagement.OrderFulfillmentManager:trigger-starts-instance",
    )
    expect(obligations.map((item) => item.id)).toContain(
      "process-manager:OrderManagement.OrderFulfillmentManager:transition:PaymentConfirmed",
    )
    expect(obligations.map((item) => item.id)).toContain(
      "process-manager:OrderManagement.OrderFulfillmentManager:terminal:PaymentConfirmed",
    )
  })

  it("derives reaction obligations from triggers and emitted commands", async () => {
    const parsed = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (parsed.kind !== "Connections") return

    const reaction = parsed.reactions?.[0]
    expect(reaction).toBeDefined()
    if (!reaction) return

    const obligations = deriveReactionObligations(parsed.context, reaction)
    expect(obligations.map((item) => item.id)).toContain(
      "reaction:OrderManagement.ReserveInventoryOnOrderPlaced:trigger-handled",
    )
    expect(obligations.map((item) => item.id)).toContain(
      "reaction:OrderManagement.ReserveInventoryOnOrderPlaced:emit:ReserveInventory:to:InventoryContext",
    )
  })

  it("derives obligations from a full connections file", async () => {
    const parsed = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (parsed.kind !== "Connections") return

    const obligations = deriveConnectionsObligations(parsed)
    expect(obligations.length).toBeGreaterThan(0)
  })
})
