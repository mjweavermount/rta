import { describe, it, expect } from "vitest"
import { formatSnapshot, type VocabSnapshot } from "../src/format/context-formatter.js"
import type { BoundedContextDeclaration, ConnectionsDeclaration } from "@rta/vocab"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const orderContext: BoundedContextDeclaration = {
  kind: "BoundedContext",
  name: "OrderManagement",
  classification: "core-domain",
  aggregates: [
    {
      name: "Order",
      id: { name: "OrderId", backing: "String" },
      commands: [
        { name: "PlaceOrder", payload: [{ name: "customerId", type: "string" }], emits: ["OrderPlaced"] },
        { name: "CancelOrder", emits: ["OrderCancelled"] },
      ],
      events: [
        { name: "OrderPlaced" },
        { name: "OrderCancelled" },
      ],
    },
  ],
  queries: [
    { name: "GetOrder", parameters: [{ name: "id", type: "string" }], returns: "OrderReadModel" },
  ],
}

const orderConnections: ConnectionsDeclaration = {
  kind: "Connections",
  context: "OrderManagement",
  publishes: [
    { event: "OrderPlaced", to: ["ShippingContext", "InventoryContext"] },
  ],
  subscribes: [
    { event: "PaymentConfirmed", from: "PaymentContext" },
  ],
}

const emptySnapshot: VocabSnapshot = {
  contexts: [],
  connections: [],
  ardCount: 0,
  root: "/my/project",
}

const fullSnapshot: VocabSnapshot = {
  contexts: [orderContext],
  connections: [orderConnections],
  ardCount: 3,
  root: "/my/project",
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("formatSnapshot — empty project", () => {
  it("includes the root path", () => {
    expect(formatSnapshot(emptySnapshot)).toContain("/my/project")
  })

  it("says no bounded contexts defined", () => {
    expect(formatSnapshot(emptySnapshot)).toContain("No bounded contexts defined")
  })

  it("mentions rta init", () => {
    expect(formatSnapshot(emptySnapshot)).toContain("rta init")
  })
})

describe("formatSnapshot — project with contexts", () => {
  it("includes context name and classification", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("OrderManagement")
    expect(out).toContain("core")
  })

  it("lists aggregate name", () => {
    expect(formatSnapshot(fullSnapshot)).toContain("Order")
  })

  it("lists commands", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("PlaceOrder")
    expect(out).toContain("CancelOrder")
  })

  it("lists events", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("OrderPlaced")
    expect(out).toContain("OrderCancelled")
  })

  it("lists queries with return type", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("GetOrder")
    expect(out).toContain("OrderReadModel")
  })

  it("shows publish connections", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("publishes")
    expect(out).toContain("ShippingContext")
    expect(out).toContain("InventoryContext")
  })

  it("shows subscribe connections", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("subscribes")
    expect(out).toContain("PaymentContext")
  })

  it("shows ARD count with rta check hint", () => {
    const out = formatSnapshot(fullSnapshot)
    expect(out).toContain("ARDs: 3")
    expect(out).toContain("rta check")
  })
})

describe("formatSnapshot — no ARDs", () => {
  it("prompts to add ARD files", () => {
    const snap: VocabSnapshot = { ...fullSnapshot, ardCount: 0 }
    expect(formatSnapshot(snap)).toContain("none defined")
  })
})
