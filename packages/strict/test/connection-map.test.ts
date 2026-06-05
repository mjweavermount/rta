import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { makeConnectionMapLayer, ConnectionMap, strictPublish, ConnectionViolation } from "../src/index.js"
import { makeRootContext, correlationToCausation } from "../src/index.js"
import { defineStrictDomainEvent } from "../src/index.js"
import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const connections = [
  {
    kind: "Connections" as const,
    context: "OrderManagement",
    publishes: [
      { event: "OrderPlaced", to: ["ShippingContext", "InventoryContext"] },
      { event: "OrderCancelled", to: ["InventoryContext"] },
    ],
    subscribes: [
      { event: "PaymentConfirmed", from: "PaymentContext" },
      { event: "InventoryReserved", from: "InventoryContext" },
    ],
  },
]

const layer = makeConnectionMapLayer(connections)
const run = <A>(e: Effect.Effect<A, any, ConnectionMap>) =>
  Effect.runPromise(e.pipe(Effect.provide(layer)))

const OrderPlaced = defineStrictDomainEvent(
  "OrderPlaced",
  Schema.Struct({ orderId: Schema.NonEmptyString }),
)

const makeOrderPlacedEvent = async () => {
  const ctx = makeRootContext("order-service")
  return Effect.runPromise(
    OrderPlaced.make(
      { orderId: "ord-1" },
      { context: ctx, aggregateId: "ord-1", aggregateType: "Order" },
    ),
  )
}

// ---------------------------------------------------------------------------
// ConnectionMap
// ---------------------------------------------------------------------------

describe("ConnectionMap.canPublish", () => {
  it("allows a whitelisted route", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canPublish("OrderManagement", "OrderPlaced", "ShippingContext")
      }),
    )
    expect(result).toBe(true)
  })

  it("allows a second whitelisted target for the same event", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canPublish("OrderManagement", "OrderPlaced", "InventoryContext")
      }),
    )
    expect(result).toBe(true)
  })

  it("denies a non-whitelisted target", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canPublish("OrderManagement", "OrderPlaced", "BillingContext")
      }),
    )
    expect(result).toBe(false)
  })

  it("denies an event not in the publishes list", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canPublish("OrderManagement", "OrderShipped", "ShippingContext")
      }),
    )
    expect(result).toBe(false)
  })

  it("denies a context not in the map at all", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canPublish("UnknownContext", "OrderPlaced", "ShippingContext")
      }),
    )
    expect(result).toBe(false)
  })
})

describe("ConnectionMap.canSubscribe", () => {
  it("allows a whitelisted subscription", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canSubscribe("OrderManagement", "PaymentConfirmed", "PaymentContext")
      }),
    )
    expect(result).toBe(true)
  })

  it("denies subscription from wrong publisher", async () => {
    const result = await run(
      Effect.gen(function* () {
        const map = yield* ConnectionMap
        return map.canSubscribe("OrderManagement", "PaymentConfirmed", "BillingContext")
      }),
    )
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// strictPublish
// ---------------------------------------------------------------------------

describe("strictPublish", () => {
  it("allows a permitted event route and returns the event", async () => {
    const event = await makeOrderPlacedEvent()
    const result = await run(strictPublish(event, "OrderManagement", "ShippingContext"))
    expect(result).toBe(event)
    expect(result._tag).toBe("OrderPlaced")
  })

  it("fails with ConnectionViolation for a non-permitted route", async () => {
    const event = await makeOrderPlacedEvent()
    const result = await Effect.runPromise(
      Effect.either(
        strictPublish(event, "OrderManagement", "BillingContext").pipe(Effect.provide(layer)),
      ),
    )
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ConnectionViolation")
      expect(result.left.sourceContext).toBe("OrderManagement")
      expect(result.left.eventTag).toBe("OrderPlaced")
      expect(result.left.targetContext).toBe("BillingContext")
    }
  })

  it("ConnectionViolation message is human-readable", async () => {
    const event = await makeOrderPlacedEvent()
    const result = await Effect.runPromise(
      Effect.either(
        strictPublish(event, "OrderManagement", "BillingContext").pipe(Effect.provide(layer)),
      ),
    )
    if (result._tag === "Left") {
      expect(result.left.message).toContain("OrderManagement")
      expect(result.left.message).toContain("OrderPlaced")
      expect(result.left.message).toContain("BillingContext")
    }
  })
})
