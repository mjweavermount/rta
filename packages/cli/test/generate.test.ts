import { describe, it, expect } from "vitest"
import type { BoundedContextDeclaration, ConnectionsDeclaration } from "@rta/vocab"
import { generateContext } from "../src/generate/context-generator.js"
import { generateRegistry } from "../src/generate/registry-generator.js"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalContext: BoundedContextDeclaration = {
  kind: "BoundedContext",
  name: "OrderManagement",
  classification: "core-domain",
}

const fullContext: BoundedContextDeclaration = {
  kind: "BoundedContext",
  name: "OrderManagement",
  classification: "core-domain",
  aggregates: [
    {
      name: "Order",
      id: { name: "OrderId", backing: "String" },
      commands: [
        {
          name: "PlaceOrder",
          payload: [{ name: "customerId", type: "string" }],
          emits: ["OrderPlaced"],
        },
        {
          name: "CancelOrder",
          payload: [{ name: "reason", type: "string?" }],
          emits: ["OrderCancelled"],
        },
      ],
      events: [
        {
          name: "OrderPlaced",
          payload: [
            { name: "orderId", type: "string" },
            { name: "customerId", type: "string" },
          ],
        },
        {
          name: "OrderCancelled",
          payload: [{ name: "orderId", type: "string" }],
        },
      ],
    },
  ],
  queries: [
    {
      name: "GetOrder",
      parameters: [{ name: "id", type: "string" }],
      returns: "string",
    },
  ],
}

const fullConnections: ConnectionsDeclaration = {
  kind: "Connections",
  context: "OrderManagement",
  subscribes: [{ event: "PaymentCaptured", from: "Billing" }],
  reactions: [
    {
      name: "ShipOrderOnPaymentCaptured",
      description: "Ship the order after billing captures payment.",
      trigger: { event: "PaymentCaptured" },
      emits: [{ command: "ShipOrder", to: "Fulfillment" }],
    },
  ],
}

// ---------------------------------------------------------------------------
// generateContext — minimal
// ---------------------------------------------------------------------------

describe("generateContext — minimal context", () => {
  it("returns 4 files (commands, events, queries, index)", () => {
    const files = generateContext(minimalContext, { strict: false })
    expect(files).toHaveLength(4)
    const names = files.map((f) => f.filename)
    expect(names).toContain("commands.ts")
    expect(names).toContain("events.ts")
    expect(names).toContain("queries.ts")
    expect(names).toContain("index.ts")
  })

  it("generates empty comment for contexts with no commands", () => {
    const files = generateContext(minimalContext, { strict: false })
    const commands = files.find((f) => f.filename === "commands.ts")!
    expect(commands.content).toContain("No commands declared")
  })

  it("generates barrel index that re-exports all three modules", () => {
    const files = generateContext(minimalContext, { strict: false })
    const index = files.find((f) => f.filename === "index.ts")!
    expect(index.content).toContain(`export * from "./commands.js"`)
    expect(index.content).toContain(`export * from "./events.js"`)
    expect(index.content).toContain(`export * from "./queries.js"`)
  })
})

// ---------------------------------------------------------------------------
// generateContext — @rta/core (non-strict)
// ---------------------------------------------------------------------------

describe("generateContext — @rta/core mode", () => {
  it("imports defineCommand from @rta/core", () => {
    const files = generateContext(fullContext, { strict: false })
    const commands = files.find((f) => f.filename === "commands.ts")!
    expect(commands.content).toContain(`from "@rta/core"`)
    expect(commands.content).toContain("defineCommand")
  })

  it("generates PlaceOrder command with Schema.Struct payload", () => {
    const files = generateContext(fullContext, { strict: false })
    const commands = files.find((f) => f.filename === "commands.ts")!
    expect(commands.content).toContain("PlaceOrderPayload")
    expect(commands.content).toContain(`PlaceOrder = defineCommand("PlaceOrder"`)
    expect(commands.content).toContain("customerId: Schema.String")
  })

  it("generates optional field with Schema.optional", () => {
    const files = generateContext(fullContext, { strict: false })
    const commands = files.find((f) => f.filename === "commands.ts")!
    expect(commands.content).toContain("Schema.optional(Schema.String)")
  })

  it("generates OrderPlaced event", () => {
    const files = generateContext(fullContext, { strict: false })
    const events = files.find((f) => f.filename === "events.ts")!
    expect(events.content).toContain("OrderPlacedPayload")
    expect(events.content).toContain(`OrderPlaced = defineDomainEvent("OrderPlaced"`)
  })

  it("generates GetOrder query", () => {
    const files = generateContext(fullContext, { strict: false })
    const queries = files.find((f) => f.filename === "queries.ts")!
    expect(queries.content).toContain("GetOrderParams")
    expect(queries.content).toContain(`GetOrder = defineQuery("GetOrder"`)
  })

  it("marks derived files as safe to overwrite and scaffold files as preserved", () => {
    const files = generateContext(fullContext, { strict: false })
    expect(files.find((f) => f.filename === "commands.ts")?.overwriteExisting).toBe(true)
    expect(files.find((f) => f.filename === "events.ts")?.overwriteExisting).toBe(true)
    expect(files.find((f) => f.filename === "queries.ts")?.overwriteExisting).toBe(true)
    expect(files.find((f) => f.filename === "index.ts")?.overwriteExisting).toBe(true)
    expect(files.find((f) => f.filename === "Order.ts")?.overwriteExisting).toBeUndefined()
    expect(files.find((f) => f.filename === "OrderRepository.ts")?.overwriteExisting).toBeUndefined()
    expect(files.find((f) => f.filename === "PlaceOrderHandler.ts")?.overwriteExisting).toBe(true)
  })

  it("generates primitive-backed repositories with exported local state", () => {
    const files = generateContext(fullContext, { strict: false })
    const repo = files.find((f) => f.filename === "OrderRepository.ts")!
    expect(repo.content).toContain(`import { InMemoryRepository } from "@rta/runtime"`)
    expect(repo.content).toContain("export const _orderStore = new Map<string, Order>()")
    expect(repo.content).toContain("new InMemoryRepository<Order>({")
    expect(repo.content).toContain(`idPrefix: "order"`)
    expect(repo.content).toContain("store: _orderStore")
  })
})

// ---------------------------------------------------------------------------
// generateContext — @rta/strict mode
// ---------------------------------------------------------------------------

describe("generateContext — @rta/strict mode", () => {
  it("imports defineStrictCommand from @rta/strict", () => {
    const files = generateContext(fullContext, { strict: true })
    const commands = files.find((f) => f.filename === "commands.ts")!
    expect(commands.content).toContain(`from "@rta/strict"`)
    expect(commands.content).toContain("defineStrictCommand")
  })

  it("imports defineStrictDomainEvent from @rta/strict", () => {
    const files = generateContext(fullContext, { strict: true })
    const events = files.find((f) => f.filename === "events.ts")!
    expect(events.content).toContain("defineStrictDomainEvent")
  })

  it("imports defineStrictQuery from @rta/strict", () => {
    const files = generateContext(fullContext, { strict: true })
    const queries = files.find((f) => f.filename === "queries.ts")!
    expect(queries.content).toContain("defineStrictQuery")
  })

  it("generates command handlers as instrumented primitive subclasses", () => {
    const files = generateContext(fullContext, { strict: true })
    const handler = files.find((f) => f.filename === "PlaceOrderHandler.ts")!
    expect(handler.content).toContain("extends InstrumentedCommandHandler<PlaceOrderCommand")
    expect(handler.content).toContain("protected executeCommand(")
    expect(handler.content).toContain("protected summarizeCommand(")
    expect(handler.content).toContain("scope = new OperationScope({")
    expect(handler.content).toContain("new PlaceOrderHandler().handle(command, scope)")
  })

  it("generates query handlers as instrumented primitive subclasses", () => {
    const files = generateContext(fullContext, { strict: true })
    const handler = files.find((f) => f.filename === "GetOrderHandler.ts")!
    expect(handler.content).toContain("extends InstrumentedQueryHandler<GetOrderQuery")
    expect(handler.content).toContain("protected executeQuery(")
    expect(handler.content).toContain("protected summarizeQuery(")
    expect(handler.content).toContain("scope = new OperationScope({")
    expect(handler.content).toContain("new GetOrderHandler().handle(query, scope)")
  })

  it("generates reaction handlers as instrumented event-handler subclasses", () => {
    const files = generateContext(fullContext, { strict: true, connections: fullConnections })
    const handler = files.find((f) => f.filename === "ShipOrderOnPaymentCapturedHandler.ts")!
    expect(handler.content).toContain("extends InstrumentedEventHandler<ShipOrderOnPaymentCapturedEvent")
    expect(handler.content).toContain("protected executeEvent(")
    expect(handler.content).toContain("protected summarizeEvent(")
    expect(handler.content).toContain("Fulfillment.ShipOrder")
    expect(handler.content).toContain("new ShipOrderOnPaymentCapturedHandler().handle(event, scope)")
    const index = files.find((f) => f.filename === "index.ts")!
    expect(index.content).toContain(`export * from "./ShipOrderOnPaymentCapturedHandler.js"`)
  })

  it("generates a strict CQRS and event dispatch surface in the registry", () => {
    const registry = generateRegistry([fullContext], [fullConnections], { strict: true })
    expect(registry).toContain(`export const dispatch = (`)
    expect(registry).toContain(`export const dispatchCommand = (`)
    expect(registry).toContain(`export const dispatchQuery = (`)
    expect(registry).toContain(`export const dispatchEvent = (`)
    expect(registry).toContain(`"OrderManagement.ShipOrderOnPaymentCaptured"`)
    expect(registry).toContain(`kind: "event" as const`)
    expect(registry).toContain(`handle: handleShipOrderOnPaymentCaptured`)
    expect(registry).toContain(`type DispatchEntry = {`)
    expect(registry).toContain(`const asDispatchEntry = (entry: RegistryEntry): DispatchEntry => entry as unknown as DispatchEntry`)
    expect(registry).toContain(`const createDispatchScope = (operation: string, kind: DispatchEntry["kind"], scope?: OperationScope): OperationScope => {`)
    expect(registry).toContain(`if (entry.kind === "event")`)
    expect(registry).toContain(`const messageContext = commandOrQuery.kind === "command"`)
    expect(registry).toContain(`Effect.provide(handled, commandOrQuery.layer as any)`)
    expect(registry).toContain(`dispatch(operation as RegistryOperation, raw, scope).pipe(Effect.asVoid)`)
  })
})
