import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import {
  CorrelationIdSchema,
  CausationIdSchema,
  generateCorrelationId,
  correlationToCausation,
  makeRootContext,
  makeChildContext,
} from "../src/index.js"
import type { CausationId } from "../src/index.js"

describe("CorrelationId", () => {
  it("decodes a valid non-empty string", () => {
    const id = Schema.decodeSync(CorrelationIdSchema)("abc-123")
    expect(id).toBe("abc-123")
  })

  it("rejects an empty string", () => {
    expect(() => Schema.decodeSync(CorrelationIdSchema)("")).toThrow()
  })

  it("generateCorrelationId produces a non-empty branded string", () => {
    const id = generateCorrelationId()
    expect(typeof id).toBe("string")
    expect(id.length).toBeGreaterThan(0)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("two generated IDs are unique", () => {
    const a = generateCorrelationId()
    const b = generateCorrelationId()
    expect(a).not.toBe(b)
  })
})

describe("CausationId", () => {
  it("decodes a valid non-empty string", () => {
    const id = Schema.decodeSync(CausationIdSchema)("cause-001")
    expect(id).toBe("cause-001")
  })

  it("rejects an empty string", () => {
    expect(() => Schema.decodeSync(CausationIdSchema)("")).toThrow()
  })
})

describe("makeRootContext", () => {
  it("produces a context with matching correlationId as causationId", () => {
    const ctx = makeRootContext("user-123")
    expect(ctx.correlationId).toBeTruthy()
    expect(ctx.causationId).toBe(ctx.correlationId)
    expect(ctx.issuedBy).toBe("user-123")
    expect(ctx.issuedAt).toBeInstanceOf(Date)
  })
})

describe("makeChildContext", () => {
  it("inherits correlationId from parent", () => {
    const parent = makeRootContext("user-1")
    const causationId = Schema.decodeSync(CausationIdSchema)("cmd-abc") as CausationId
    const child = makeChildContext(parent, causationId)

    expect(child.correlationId).toBe(parent.correlationId)
    expect(child.causationId).toBe(causationId)
    expect(child.issuedBy).toBe(parent.issuedBy)
  })

  it("allows overriding issuedBy in child context", () => {
    const parent = makeRootContext("user-1")
    const causationId = correlationToCausation(parent.correlationId)
    const child = makeChildContext(parent, causationId, "service-payments")

    expect(child.issuedBy).toBe("service-payments")
    expect(child.correlationId).toBe(parent.correlationId)
  })
})
