import { describe, it, expect } from "vitest"
import { Effect, Schema } from "effect"
import {
  defineStrictCommand,
  defineStrictDomainEvent,
  defineStrictQuery,
  makeRootContext,
  makeChildContext,
  correlationToCausation,
} from "../src/index.js"
import { isCommand, isDomainEvent, isQuery } from "@rta/core"

const run = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(e)
const runFail = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(Effect.flip(e))

// Schemas
const PlaceOrderPayload = Schema.Struct({
  customerId: Schema.NonEmptyString,
  amount: Schema.Positive,
})
const OrderPlacedPayload = Schema.Struct({
  orderId: Schema.NonEmptyString,
  amount: Schema.Positive,
})
const GetOrderParams = Schema.Struct({ id: Schema.NonEmptyString })
const OrderReadModel = Schema.Struct({ id: Schema.NonEmptyString, status: Schema.NonEmptyString })

// Factories
const PlaceOrder = defineStrictCommand("PlaceOrder", PlaceOrderPayload)
const OrderPlaced = defineStrictDomainEvent("OrderPlaced", OrderPlacedPayload)
const GetOrder = defineStrictQuery("GetOrder", GetOrderParams, OrderReadModel)

// ---------------------------------------------------------------------------
// StrictCommand
// ---------------------------------------------------------------------------

describe("StrictCommand", () => {
  it("creates a command with full MessageContext", async () => {
    const ctx = makeRootContext("user-1")
    const cmd = await run(PlaceOrder.make({ customerId: "cust-1", amount: 100 }, ctx))

    expect(cmd._tag).toBe("PlaceOrder")
    expect(cmd.payload.customerId).toBe("cust-1")
    expect(cmd.correlationId).toBe(ctx.correlationId)
    expect(cmd.causationId).toBe(ctx.causationId)
    expect(cmd.issuedBy).toBe("user-1")
    expect(cmd.issuedAt).toBeInstanceOf(Date)
    // It is also a core Command
    expect(isCommand(cmd)).toBe(true)
  })

  it("rejects invalid payload", async () => {
    const ctx = makeRootContext("user-1")
    const err = await runFail(PlaceOrder.make({ customerId: "", amount: 100 }, ctx))
    expect(err._tag).toBe("ParseError")
  })

  it("is() narrows correctly", async () => {
    const ctx = makeRootContext("user-1")
    const cmd = await run(PlaceOrder.make({ customerId: "c", amount: 1 }, ctx))
    expect(PlaceOrder.is(cmd)).toBe(true)
    expect(PlaceOrder.is({ _tag: "OtherCommand" })).toBe(false)
  })

  it("correlationId propagates through a chain", async () => {
    const rootCtx = makeRootContext("api-gateway")
    const cmd = await run(PlaceOrder.make({ customerId: "c", amount: 1 }, rootCtx))

    // Downstream context derives from command's correlationId
    const childCtx = makeChildContext(rootCtx, correlationToCausation(rootCtx.correlationId))
    expect(childCtx.correlationId).toBe(cmd.correlationId)
  })
})

// ---------------------------------------------------------------------------
// StrictDomainEvent
// ---------------------------------------------------------------------------

describe("StrictDomainEvent", () => {
  it("creates an event with correlation context and aggregate provenance", async () => {
    const ctx = makeRootContext("order-service")
    const evt = await run(
      OrderPlaced.make(
        { orderId: "ord-1", amount: 150 },
        { context: ctx, aggregateId: "ord-1", aggregateType: "Order" },
      ),
    )

    expect(evt._tag).toBe("OrderPlaced")
    expect(evt.payload.orderId).toBe("ord-1")
    expect(evt.correlationId).toBe(ctx.correlationId)
    expect(evt.aggregateId).toBe("ord-1")
    expect(evt.aggregateType).toBe("Order")
    expect(evt.occurredAt).toBeInstanceOf(Date)
    // It is also a core DomainEvent
    expect(isDomainEvent(evt)).toBe(true)
  })

  it("accepts an explicit causationId", async () => {
    const ctx = makeRootContext("order-service")
    const explicitCause = correlationToCausation(ctx.correlationId)
    const evt = await run(
      OrderPlaced.make(
        { orderId: "ord-1", amount: 50 },
        { context: ctx, causationId: explicitCause, aggregateId: "ord-1", aggregateType: "Order" },
      ),
    )
    expect(evt.causationId).toBe(explicitCause)
  })
})

// ---------------------------------------------------------------------------
// StrictQuery
// ---------------------------------------------------------------------------

describe("StrictQuery", () => {
  it("creates a query with the full execution ID envelope", async () => {
    const ctx = makeRootContext("user-1")
    const q = await run(GetOrder.make({ id: "ord-1" }, ctx))

    expect(q._tag).toBe("GetOrder")
    expect(q.payload.id).toBe("ord-1")
    expect(q.messageId).toEqual(expect.any(String))
    expect(q.correlationId).toBe(ctx.correlationId)
    expect(q.causationId).toBe(ctx.causationId)
    expect(q.issuedAt).toBeInstanceOf(Date)
    expect(q.issuedBy).toBe("user-1")
    // It is also a core Query
    expect(isQuery(q)).toBe(true)
  })

  it("exposes resultSchema for response validation", () => {
    expect(GetOrder.resultSchema).toBe(OrderReadModel)
  })
})
