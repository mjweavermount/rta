import { describe, it, expect } from "vitest"
import { Effect, Schema } from "effect"
import {
  // Factories
  defineCommand,
  defineDomainEvent,
  defineQuery,
  makeValueObject,
  makeEntity,
  makeAggregateRoot,
  raiseEvents,
  clearPendingEvents,
  makeRule,
  ruleViolation,
  makeDecision,
  outcome,
  makeReaction,
  makeProcessManager,
  transitionProcessManager,
  clearPendingCommands,
  // Guards
  isCommand,
  isDomainEvent,
  isQuery,
  isValueObject,
  isEntity,
  isAggregateRoot,
  isRule,
  isDecision,
  isReaction,
  isProcessManager,
  // TypeIds (runtime symbols — for `in` checks)
  CommandTypeId,
  DomainEventTypeId,
  QueryTypeId,
  ValueObjectTypeId,
  EntityTypeId,
  AggregateRootTypeId,
  RuleTypeId,
  DecisionTypeId,
  ReactionTypeId,
  ProcessManagerTypeId,
} from "../src/index.js"

// ---------------------------------------------------------------------------
// Test schemas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const PlaceOrder = defineCommand("PlaceOrder", PlaceOrderPayload)
const OrderPlaced = defineDomainEvent("OrderPlaced", OrderPlacedPayload)
const GetOrder = defineQuery("GetOrder", GetOrderParams, OrderReadModel)

const run = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(e)
const runFail = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(Effect.flip(e))

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

describe("Command", () => {
  it("makes a valid command", async () => {
    const cmd = await run(PlaceOrder.make({ customerId: "cust-1", amount: 100 }))
    expect(cmd._tag).toBe("PlaceOrder")
    expect(cmd.payload.customerId).toBe("cust-1")
    expect(cmd.payload.amount).toBe(100)
    expect(CommandTypeId in cmd).toBe(true)
  })

  it("rejects invalid payload (schema)", async () => {
    const err = await runFail(PlaceOrder.make({ customerId: "", amount: 100 }))
    expect(err._tag).toBe("ParseError")
  })

  it("rejects negative amount", async () => {
    const err = await runFail(PlaceOrder.make({ customerId: "c", amount: -1 }))
    expect(err._tag).toBe("ParseError")
  })

  it("isCommand → true for commands", async () => {
    const cmd = await run(PlaceOrder.make({ customerId: "c", amount: 1 }))
    expect(isCommand(cmd)).toBe(true)
  })

  it("isCommand → false for non-commands", () => {
    expect(isCommand({})).toBe(false)
    expect(isCommand(null)).toBe(false)
    expect(isCommand("str")).toBe(false)
  })

  it("PlaceOrder.is narrows correctly", async () => {
    const cmd = await run(PlaceOrder.make({ customerId: "c", amount: 1 }))
    expect(PlaceOrder.is(cmd)).toBe(true)
    const evt = await run(OrderPlaced.make({ orderId: "o", amount: 1 }))
    expect(PlaceOrder.is(evt)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// DomainEvent
// ---------------------------------------------------------------------------

describe("DomainEvent", () => {
  it("makes a valid event with occurredAt", async () => {
    const before = new Date()
    const evt = await run(OrderPlaced.make({ orderId: "ord-1", amount: 50 }))
    const after = new Date()
    expect(evt._tag).toBe("OrderPlaced")
    expect(evt.payload.orderId).toBe("ord-1")
    expect(DomainEventTypeId in evt).toBe(true)
    expect(evt.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(evt.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it("rejects invalid payload", async () => {
    const err = await runFail(OrderPlaced.make({ orderId: "", amount: 0 }))
    expect(err._tag).toBe("ParseError")
  })
})

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

describe("Query", () => {
  it("makes a valid query", async () => {
    const q = await run(GetOrder.make({ id: "ord-1" }))
    expect(q._tag).toBe("GetOrder")
    expect(q.payload.id).toBe("ord-1")
    expect(QueryTypeId in q).toBe(true)
  })

  it("exposes resultSchema on the constructor", () => {
    expect(GetOrder.resultSchema).toBe(OrderReadModel)
  })
})

// ---------------------------------------------------------------------------
// ValueObject
// ---------------------------------------------------------------------------

describe("ValueObject", () => {
  it("creates a value object", () => {
    const money = makeValueObject({ amount: 100, currency: "USD" })
    expect(isValueObject(money)).toBe(true)
    expect(ValueObjectTypeId in money).toBe(true)
    expect(money.value.amount).toBe(100)
  })

  it("isValueObject → false for non-VOs", () => {
    expect(isValueObject(null)).toBe(false)
    expect(isValueObject({ amount: 100 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

describe("Entity", () => {
  it("creates an entity", () => {
    const item = makeEntity("item-1", { productId: "prod-1", qty: 3 })
    expect(isEntity(item)).toBe(true)
    expect(EntityTypeId in item).toBe(true)
    expect(item.id).toBe("item-1")
    expect(item.data.qty).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// AggregateRoot
// ---------------------------------------------------------------------------

describe("AggregateRoot", () => {
  it("creates an aggregate with empty pendingEvents", () => {
    const order = makeAggregateRoot("ord-1", { status: "pending" })
    expect(isAggregateRoot(order)).toBe(true)
    expect(AggregateRootTypeId in order).toBe(true)
    expect(EntityTypeId in order).toBe(true)
    expect(order.id).toBe("ord-1")
    expect(order.pendingEvents).toHaveLength(0)
  })

  it("raiseEvents appends without mutating original", async () => {
    const order = makeAggregateRoot<string, { status: string }>("ord-1", { status: "pending" })
    const evt = await run(OrderPlaced.make({ orderId: "ord-1", amount: 100 }))

    const updated = raiseEvents(order, evt)

    expect(order.pendingEvents).toHaveLength(0)
    expect(updated.pendingEvents).toHaveLength(1)
    expect(updated.id).toBe("ord-1")
  })

  it("clearPendingEvents returns aggregate with empty events", async () => {
    const order = makeAggregateRoot<string, { status: string }>("ord-1", { status: "pending" })
    const evt = await run(OrderPlaced.make({ orderId: "ord-1", amount: 100 }))
    const withEvents = raiseEvents(order, evt)
    const cleared = clearPendingEvents(withEvents)

    expect(withEvents.pendingEvents).toHaveLength(1)
    expect(cleared.pendingEvents).toHaveLength(0)
    expect(cleared.id).toBe("ord-1")
  })
})

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

describe("Rule", () => {
  const OrderMustHaveItems = makeRule<{ items: string[] }, "OrderHasNoItems">(
    "OrderMustHaveItems",
    (input) =>
      input.items.length > 0
        ? Effect.void
        : Effect.fail(ruleViolation("OrderHasNoItems", "OrderMustHaveItems")),
  )

  const CustomerNotSuspended = makeRule<{ suspended: boolean }, "CustomerAccountSuspended">(
    "CustomerNotSuspended",
    (input) =>
      input.suspended
        ? Effect.fail(ruleViolation("CustomerAccountSuspended", "CustomerNotSuspended", "Account is suspended"))
        : Effect.void,
  )

  it("passes when condition holds", async () => {
    await run(OrderMustHaveItems.check({ items: ["item-1"] }))
  })

  it("fails with the correct violation _tag", async () => {
    const v = await runFail(OrderMustHaveItems.check({ items: [] }))
    expect(v._tag).toBe("OrderHasNoItems")
    expect(v.rule).toBe("OrderMustHaveItems")
  })

  it("fails with optional message", async () => {
    const v = await runFail(CustomerNotSuspended.check({ suspended: true }))
    expect(v._tag).toBe("CustomerAccountSuspended")
    expect(v.message).toBe("Account is suspended")
  })

  it("carries RuleTypeId", () => {
    expect(RuleTypeId in OrderMustHaveItems).toBe(true)
    expect(isRule(OrderMustHaveItems)).toBe(true)
  })

  it("isRule → false for non-rules", () => {
    expect(isRule({})).toBe(false)
    expect(isRule(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

describe("Decision", () => {
  type PricingOutcome =
    | { readonly _tag: "Standard" }
    | { readonly _tag: "Premium" }
    | { readonly _tag: "Enterprise" }

  const PricingTierDecision = makeDecision<{ orderCount: number }, PricingOutcome>(
    "PricingTierDecision",
    (input) =>
      Effect.succeed(
        input.orderCount >= 100 ? outcome("Enterprise")
        : input.orderCount >= 20  ? outcome("Premium")
        : outcome("Standard"),
      ),
  )

  it("returns Standard for low order counts", async () => {
    const result = await run(PricingTierDecision.evaluate({ orderCount: 5 }))
    expect(result._tag).toBe("Standard")
  })

  it("returns Premium for moderate order counts", async () => {
    const result = await run(PricingTierDecision.evaluate({ orderCount: 50 }))
    expect(result._tag).toBe("Premium")
  })

  it("returns Enterprise for high order counts", async () => {
    const result = await run(PricingTierDecision.evaluate({ orderCount: 200 }))
    expect(result._tag).toBe("Enterprise")
  })

  it("carries DecisionTypeId", () => {
    expect(DecisionTypeId in PricingTierDecision).toBe(true)
    expect(isDecision(PricingTierDecision)).toBe(true)
  })

  it("is always total — never fails", async () => {
    // evaluate returns Effect<O, never> — type-level guarantee, runtime confirmation
    const result = await run(PricingTierDecision.evaluate({ orderCount: -1 }))
    expect(result._tag).toBe("Standard")
  })
})

// ---------------------------------------------------------------------------
// Reaction
// ---------------------------------------------------------------------------

describe("Reaction", () => {
  interface OrderPlacedEvt { readonly _tag: "OrderPlaced"; readonly orderId: string }
  interface ReserveInventoryCmd { readonly _tag: "ReserveInventory"; readonly orderId: string }

  const ReserveOnPlaced = makeReaction<OrderPlacedEvt, ReserveInventoryCmd>(
    "ReserveInventoryOnOrderPlaced",
    "OrderPlaced",
    (event) => Effect.succeed([{ _tag: "ReserveInventory", orderId: event.orderId }]),
  )

  it("produces commands from the trigger event", async () => {
    const cmds = await run(ReserveOnPlaced.handle({ _tag: "OrderPlaced", orderId: "ord-1" }))
    expect(cmds).toHaveLength(1)
    expect(cmds[0]?._tag).toBe("ReserveInventory")
    expect(cmds[0]?.orderId).toBe("ord-1")
  })

  it("carries the correct trigger and ReactionTypeId", () => {
    expect(ReserveOnPlaced.trigger).toBe("OrderPlaced")
    expect(ReactionTypeId in ReserveOnPlaced).toBe(true)
    expect(isReaction(ReserveOnPlaced)).toBe(true)
  })

  it("can produce zero commands (noop)", async () => {
    const NoopReaction = makeReaction<OrderPlacedEvt, ReserveInventoryCmd>(
      "NoopReaction",
      "OrderPlaced",
      () => Effect.succeed([]),
    )
    const cmds = await run(NoopReaction.handle({ _tag: "OrderPlaced", orderId: "x" }))
    expect(cmds).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// ProcessManager
// ---------------------------------------------------------------------------

describe("ProcessManager", () => {
  interface PMState {
    readonly orderId: string
    readonly inventoryReserved: boolean
    readonly paymentConfirmed: boolean
  }

  type PMEvent =
    | { readonly _tag: "InventoryReserved"; readonly orderId: string }
    | { readonly _tag: "PaymentConfirmed"; readonly orderId: string }

  type PMCommand =
    | { readonly _tag: "RequestPayment"; readonly orderId: string }
    | { readonly _tag: "DispatchOrder"; readonly orderId: string }

  it("creates a ProcessManager in initial state", () => {
    const pm = makeProcessManager<string, PMState, PMEvent, PMCommand>(
      "pm-1",
      { orderId: "ord-1", inventoryReserved: false, paymentConfirmed: false },
    )
    expect(pm.id).toBe("pm-1")
    expect(pm.state.orderId).toBe("ord-1")
    expect(pm.pendingCommands).toHaveLength(0)
    expect(pm.isTerminal).toBe(false)
    expect(ProcessManagerTypeId in pm).toBe(true)
    expect(AggregateRootTypeId in pm).toBe(true)
    expect(EntityTypeId in pm).toBe(true)
  })

  it("carries ProcessManagerTypeId AND AggregateRootTypeId AND EntityTypeId", () => {
    const pm = makeProcessManager("pm-x", { status: "active" })
    expect(isProcessManager(pm)).toBe(true)
    expect(isAggregateRoot(pm)).toBe(true)
    expect(isEntity(pm)).toBe(true)
  })

  it("transitionProcessManager updates state and queues commands", () => {
    const pm = makeProcessManager<string, PMState, PMEvent, PMCommand>(
      "pm-1",
      { orderId: "ord-1", inventoryReserved: false, paymentConfirmed: false },
    )
    const after = transitionProcessManager(
      pm,
      { ...pm.state, inventoryReserved: true },
      [{ _tag: "RequestPayment", orderId: "ord-1" }],
    )
    expect(after.state.inventoryReserved).toBe(true)
    expect(after.pendingCommands).toHaveLength(1)
    expect(after.pendingCommands[0]?._tag).toBe("RequestPayment")
    expect(after.isTerminal).toBe(false)
    // original unchanged
    expect(pm.pendingCommands).toHaveLength(0)
    expect(pm.state.inventoryReserved).toBe(false)
  })

  it("transitionProcessManager with terminal: true marks as terminal", () => {
    const pm = makeProcessManager<string, PMState, PMEvent, PMCommand>(
      "pm-1",
      { orderId: "ord-1", inventoryReserved: true, paymentConfirmed: false },
    )
    const after = transitionProcessManager(
      pm,
      { ...pm.state, paymentConfirmed: true },
      [{ _tag: "DispatchOrder", orderId: "ord-1" }],
      { terminal: true },
    )
    expect(after.isTerminal).toBe(true)
    expect(after.pendingCommands[0]?._tag).toBe("DispatchOrder")
  })

  it("clearPendingCommands empties the queue without touching state", () => {
    const pm = makeProcessManager<string, PMState, PMEvent, PMCommand>(
      "pm-1",
      { orderId: "ord-1", inventoryReserved: true, paymentConfirmed: false },
    )
    const withCmds = transitionProcessManager(
      pm,
      pm.state,
      [{ _tag: "RequestPayment", orderId: "ord-1" }],
    )
    const cleared = clearPendingCommands(withCmds)
    expect(cleared.pendingCommands).toHaveLength(0)
    expect(cleared.state.orderId).toBe("ord-1")
    expect(withCmds.pendingCommands).toHaveLength(1) // original unchanged
  })
})

// ---------------------------------------------------------------------------
// TypeId cross-discrimination
// ---------------------------------------------------------------------------

describe("TypeId discrimination", () => {
  it("only the correct TypeId is present on each primitive", async () => {
    const cmd = await run(PlaceOrder.make({ customerId: "c", amount: 1 }))
    const evt = await run(OrderPlaced.make({ orderId: "o", amount: 1 }))
    const qry = await run(GetOrder.make({ id: "o" }))
    const vo = makeValueObject({ x: 1 })
    const ent = makeEntity("e-1", { name: "test" })
    const agg = makeAggregateRoot("a-1", { status: "ok" })

    // Commands carry CommandTypeId, nothing else from this set
    expect(isCommand(cmd)).toBe(true)
    expect(isDomainEvent(cmd)).toBe(false)
    expect(isQuery(cmd)).toBe(false)
    expect(isAggregateRoot(cmd)).toBe(false)

    // Events carry DomainEventTypeId
    expect(isDomainEvent(evt)).toBe(true)
    expect(isCommand(evt)).toBe(false)

    // Queries carry QueryTypeId
    expect(isQuery(qry)).toBe(true)
    expect(isCommand(qry)).toBe(false)

    // ValueObject carries ValueObjectTypeId, not AggregateRootTypeId
    expect(isValueObject(vo)).toBe(true)
    expect(isAggregateRoot(vo)).toBe(false)
    expect(isEntity(vo)).toBe(false)

    // AggregateRoot carries BOTH AggregateRootTypeId AND EntityTypeId
    expect(isAggregateRoot(agg)).toBe(true)
    expect(isEntity(agg)).toBe(true)
    expect(isValueObject(agg)).toBe(false)
  })
})
