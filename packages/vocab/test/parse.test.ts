import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { readVocabFile, parseVocabContent, VocabParseError } from "../src/index.js"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const fixture = (rel: string) => join(__dirname, "fixtures", rel)

const run = <A>(effect: Effect.Effect<A, VocabParseError>) =>
  Effect.runPromise(effect)

const runFail = <A>(effect: Effect.Effect<A, VocabParseError>) =>
  Effect.runPromise(Effect.flip(effect))

// ---------------------------------------------------------------------------
// BoundedContext
// ---------------------------------------------------------------------------

describe("BoundedContext", () => {
  it("parses the order-management fixture", async () => {
    const result = await run(readVocabFile(fixture("contexts/order-management.context.yaml")))

    expect(result.kind).toBe("BoundedContext")
    if (result.kind !== "BoundedContext") return

    expect(result.name).toBe("OrderManagement")
    expect(result.classification).toBe("core-domain")
    expect(result.imports).toHaveLength(2)
    expect(result.aggregates).toHaveLength(1)
    expect(result.aggregates?.[0]?.name).toBe("Order")
    expect(result.aggregates?.[0]?.commands).toHaveLength(2)
    expect(result.aggregates?.[0]?.events).toHaveLength(2)
    expect(result.queries).toHaveLength(2)
    expect(result.readModels).toHaveLength(1)
    expect(result.domainServices).toHaveLength(1)
  })

  it("rejects an unknown classification", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: not-a-real-classification
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects a missing name", async () => {
    const yaml = `
kind: BoundedContext
classification: core-domain
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects an empty name", async () => {
    const yaml = `
kind: BoundedContext
name: ""
classification: core-domain
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects malformed YAML", async () => {
    const yaml = `kind: BoundedContext\nname: [unclosed`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("accepts a minimal context with only required fields", async () => {
    const yaml = `
kind: BoundedContext
name: Minimal
classification: supporting
`
    const result = await run(parseVocabContent(yaml))
    expect(result.kind).toBe("BoundedContext")
    if (result.kind !== "BoundedContext") return
    expect(result.aggregates).toBeUndefined()
    expect(result.imports).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

describe("Connections", () => {
  it("parses the order-management connections fixture", async () => {
    const result = await run(
      readVocabFile(fixture("connections/order-management.connections.yaml")),
    )

    expect(result.kind).toBe("Connections")
    if (result.kind !== "Connections") return

    expect(result.context).toBe("OrderManagement")
    expect(result.publishes).toHaveLength(2)
    expect(result.subscribes).toHaveLength(2)
    expect(result.publishes?.[0]?.event).toBe("OrderPlaced")
    expect(result.publishes?.[0]?.to).toContain("ShippingContext")
  })

  it("rejects a connections file missing context", async () => {
    const yaml = `
kind: Connections
publishes:
  - event: Foo
    to: [Bar]
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects a publishes rule with empty to array", async () => {
    const yaml = `
kind: Connections
context: SomeContext
publishes:
  - event: SomethingHappened
    to: []
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })
})

// ---------------------------------------------------------------------------
// Rules, Decisions, ProcessManagers (context YAML)
// ---------------------------------------------------------------------------

describe("Domain logic — context YAML", () => {
  it("parses rules on an aggregate", async () => {
    const result = await run(
      readVocabFile(fixture("contexts/order-management-with-logic.context.yaml")),
    )
    expect(result.kind).toBe("BoundedContext")
    if (result.kind !== "BoundedContext") return

    const order = result.aggregates?.[0]
    expect(order?.rules).toHaveLength(2)
    expect(order?.rules?.[0]?.name).toBe("OrderMustHaveItems")
    expect(order?.rules?.[0]?.violation).toBe("OrderHasNoItems")
    expect(order?.rules?.[0]?.implementation?.shape).toBe("predicate")
    expect(order?.rules?.[1]?.input).toHaveLength(1)
    expect(order?.rules?.[1]?.input?.[0]?.name).toBe("accountStatus")
    expect(order?.rules?.[1]?.implementation?.shape).toBe("state-precondition")
  })

  it("parses decisions on a context", async () => {
    const result = await run(
      readVocabFile(fixture("contexts/order-management-with-logic.context.yaml")),
    )
    if (result.kind !== "BoundedContext") return

    expect(result.decisions).toHaveLength(2)
    expect(result.decisions?.[0]?.name).toBe("PricingTierDecision")
    expect(result.decisions?.[0]?.outcomes).toEqual(["Standard", "Premium", "Enterprise"])
    expect(result.decisions?.[0]?.input).toHaveLength(1)
    expect(result.decisions?.[0]?.implementation?.shape).toBe("numeric-buckets")
  })

  it("parses processManagers on a context", async () => {
    const result = await run(
      readVocabFile(fixture("contexts/order-management-with-logic.context.yaml")),
    )
    if (result.kind !== "BoundedContext") return

    expect(result.processManagers).toHaveLength(1)
    const pm = result.processManagers?.[0]
    expect(pm?.name).toBe("OrderFulfillmentManager")
    expect(pm?.pattern).toBe("saga")
    expect(pm?.implementation?.shape).toBe("linear-flow")
    expect(pm?.trigger.event).toBe("OrderPlaced")
    expect(pm?.trigger.from).toBe("OrderManagement")
    expect(pm?.state).toHaveLength(3)
    expect(pm?.transitions).toHaveLength(3)
    expect(pm?.transitions[2]?.terminal).toBe(true)
    expect(pm?.transitions[2]?.when).toBe("RetryBudgetExhausted")
  })

  it("rejects a decision with empty outcomes", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: generic
decisions:
  - name: BadDecision
    input: []
    outcomes: []
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects an incompatible decision pattern and implementation shape", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: generic
decisions:
  - name: BadDecision
    outcomes: [Open, Closed]
    pattern: lifecycle
    implementation:
      shape: numeric-buckets
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects an incompatible rule pattern and implementation shape", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: generic
aggregates:
  - name: Thing
    id: { name: ThingId, backing: UUID }
    rules:
      - name: ThingMustBeOpen
        violation: ThingNotOpen
        pattern: guard
        implementation:
          shape: exclusivity
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects a processManager with empty transitions", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: generic
processManagers:
  - name: BadPM
    id: { name: BadPMId, backing: UUID }
    trigger: { event: SomethingHappened, from: SomeContext }
    state: []
    transitions: []
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects an incompatible processManager pattern and implementation shape", async () => {
    const yaml = `
kind: BoundedContext
name: Foo
classification: generic
processManagers:
  - name: BadPM
    pattern: retry-loop
    implementation:
      shape: linear-flow
    id: { name: BadPMId, backing: UUID }
    trigger: { event: SomethingHappened, from: SomeContext }
    state:
      - { name: attemptCount, type: Int }
    transitions:
      - on: SomethingHappened
        emits: [RetryThing]
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })
})

// ---------------------------------------------------------------------------
// Reactions (connections YAML)
// ---------------------------------------------------------------------------

describe("Domain logic — connections YAML", () => {
  it("parses reactions on a connections file", async () => {
    const result = await run(
      readVocabFile(fixture("connections/order-management-with-reactions.connections.yaml")),
    )
    expect(result.kind).toBe("Connections")
    if (result.kind !== "Connections") return

    expect(result.reactions).toHaveLength(2)
    expect(result.reactions?.[0]?.name).toBe("ReserveInventoryOnOrderPlaced")
    expect(result.reactions?.[0]?.pattern).toBe("command-emitter")
    expect(result.reactions?.[0]?.implementation?.shape).toBe("single-dispatch")
    expect(result.reactions?.[0]?.trigger.event).toBe("OrderPlaced")
    expect(result.reactions?.[0]?.emits[0]?.command).toBe("ReserveInventory")
    expect(result.reactions?.[0]?.emits[0]?.to).toBe("InventoryContext")
    expect(result.reactions?.[1]?.emits).toHaveLength(2)
  })

  it("rejects a reaction with empty emits", async () => {
    const yaml = `
kind: Connections
context: Foo
reactions:
  - name: BadReaction
    trigger: { event: SomethingHappened }
    emits: []
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects an incompatible reaction pattern and implementation shape", async () => {
    const yaml = `
kind: Connections
context: Foo
reactions:
  - name: BadReaction
    pattern: notification
    implementation:
      shape: idempotent-upsert
    trigger: { event: SomethingHappened }
    emits:
      - { command: SendEmail, to: Notifications }
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })
})

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

describe("VocabFile union", () => {
  it("dispatches to BoundedContext on kind: BoundedContext", async () => {
    const yaml = `kind: BoundedContext\nname: X\nclassification: generic`
    const result = await run(parseVocabContent(yaml))
    expect(result.kind).toBe("BoundedContext")
  })

  it("dispatches to Connections on kind: Connections", async () => {
    const yaml = `kind: Connections\ncontext: X`
    const result = await run(parseVocabContent(yaml))
    expect(result.kind).toBe("Connections")
  })

  it("rejects an unknown kind", async () => {
    const yaml = `kind: Unknown\nname: X`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })
})
