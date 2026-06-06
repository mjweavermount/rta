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

  it("parses governed tool surfaces and runtime capabilities", async () => {
    const yaml = `
kind: BoundedContext
name: AffineGateway
classification: supporting
runtimeCapabilities:
  - name: OperatorVault
    kind: vault-secret-backend
    description: Reads operator-scoped AFFiNE credentials.
    configFields:
      - { name: mount, type: NonEmptyString }
    secretFields:
      - { name: token, type: SecretRef }
toolSurfaces:
  - name: AffineMcp
    service: affine
    protocol: mcp
    runtimeCapabilities: [OperatorVault]
    tools:
      - name: affine.current_user
        safety: read
        credentialMode: user-required
        returns: CurrentUser
      - name: affine.doc_update
        safety: fail-closed
        credentialMode: user-required
        failClosedReason: AFFiNE write API must be verified before document mutation is enabled.
`
    const result = await run(parseVocabContent(yaml))
    expect(result.kind).toBe("BoundedContext")
    if (result.kind !== "BoundedContext") return
    expect(result.runtimeCapabilities?.[0]?.kind).toBe("vault-secret-backend")
    expect(result.toolSurfaces?.[0]?.protocol).toBe("mcp")
    expect(result.toolSurfaces?.[0]?.tools).toHaveLength(2)
  })

  it("parses ports, boundary schemas, adapter bindings, and published OpenAPI language", async () => {
    const yaml = `
kind: BoundedContext
name: AffineGateway
classification: supporting
ports:
  - name: AffineDocumentPort
    kind: graphql-client
    direction: outbound
    operations: [readDocument]
    inputSchemas: [ReadDocInput]
    outputSchemas: [ReadDocOutput]
    policies: [ReadOnlyAffinePolicy]
boundarySchemas:
  - name: ReadDocInput
    kind: dto
    source: effect-schema
    fields:
      - { name: docId, type: NonEmptyString }
    mapsTo: ReadAffineDoc
    validation:
      required: true
      strategy: decode
    openapiRef: "#/components/schemas/ReadDocInput"
  - name: ReadDocOutput
    kind: output
    source: openapi
    fields:
      - { name: markdown, type: String }
    validation:
      required: true
      strategy: validate-only
    openapiRef: "#/components/schemas/ReadDocOutput"
adapterBindings:
  - name: LocalAffineDocumentBinding
    port: AffineDocumentPort
    adapter: FakeAffineAdapter
    target: local-demo
    mode: fake
    configSchema: ReadDocInput
    driftCheck: affine-openapi-contract
publishedLanguages:
  - name: AffineGatewayOpenApi
    protocol: openapi
    boundarySchemas: [ReadDocInput, ReadDocOutput]
    ports: [AffineDocumentPort]
    source: openapi/affine-gateway.yaml
`
    const result = await run(parseVocabContent(yaml))
    expect(result.kind).toBe("BoundedContext")
    if (result.kind !== "BoundedContext") return
    expect(result.ports?.[0]?.name).toBe("AffineDocumentPort")
    expect(result.boundarySchemas?.[0]?.validation.strategy).toBe("decode")
    expect(result.adapterBindings?.[0]?.mode).toBe("fake")
    expect(result.publishedLanguages?.[0]?.protocol).toBe("openapi")
  })

  it("rejects boundary DTOs that do not require validation", async () => {
    const yaml = `
kind: BoundedContext
name: BadGateway
classification: supporting
boundarySchemas:
  - name: UnsafeInput
    kind: dto
    source: effect-schema
    validation:
      required: false
      strategy: validate-only
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects adapter bindings and published languages that reference missing ports or schemas", async () => {
    const yaml = `
kind: BoundedContext
name: BadGateway
classification: supporting
boundarySchemas:
  - name: KnownInput
    kind: input
    source: effect-schema
    validation:
      required: true
      strategy: decode
adapterBindings:
  - name: BadBinding
    port: MissingPort
    adapter: FakeAdapter
    target: local-demo
    mode: fake
    configSchema: MissingSchema
publishedLanguages:
  - name: BadOpenApi
    protocol: openapi
    boundarySchemas: [MissingSchema]
    ports: [MissingPort]
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects fail-closed tools without an explicit reason", async () => {
    const yaml = `
kind: BoundedContext
name: AffineGateway
classification: supporting
toolSurfaces:
  - name: AffineMcp
    service: affine
    protocol: mcp
    tools:
      - name: affine.doc_update
        safety: fail-closed
        credentialMode: user-required
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
  })

  it("rejects tool surfaces that reference unknown runtime capabilities", async () => {
    const yaml = `
kind: BoundedContext
name: AffineGateway
classification: supporting
toolSurfaces:
  - name: AffineMcp
    service: affine
    protocol: mcp
    runtimeCapabilities: [MissingVault]
    tools:
      - name: affine.current_user
        safety: read
        credentialMode: user-required
`
    const err = await runFail(parseVocabContent(yaml))
    expect(err._tag).toBe("VocabParseError")
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
