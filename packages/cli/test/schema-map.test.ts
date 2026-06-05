import { describe, it, expect } from "vitest"
import { mapFieldType } from "../src/generate/schema-map.js"

describe("mapFieldType", () => {
  it("maps string to Schema.String", () => {
    expect(mapFieldType("string")).toBe("Schema.String")
  })

  it("maps number to Schema.Number", () => {
    expect(mapFieldType("number")).toBe("Schema.Number")
  })

  it("maps boolean to Schema.Boolean", () => {
    expect(mapFieldType("boolean")).toBe("Schema.Boolean")
  })

  it("maps Date to Schema.DateFromSelf", () => {
    expect(mapFieldType("Date")).toBe("Schema.DateFromSelf")
  })

  it("maps uuid to Schema.UUID", () => {
    expect(mapFieldType("uuid")).toBe("Schema.UUID")
  })

  it("maps non-empty-string to Schema.NonEmptyString", () => {
    expect(mapFieldType("non-empty-string")).toBe("Schema.NonEmptyString")
  })

  it("maps string? to Schema.optional(Schema.String)", () => {
    expect(mapFieldType("string?")).toBe("Schema.optional(Schema.String)")
  })

  it("maps number? to Schema.optional(Schema.Number)", () => {
    expect(mapFieldType("number?")).toBe("Schema.optional(Schema.Number)")
  })

  it("maps unknown type to Schema.String fallback", () => {
    expect(mapFieldType("CustomType")).toBe("Schema.String")
  })

  it("maps unknown optional type to Schema.optional(Schema.String)", () => {
    expect(mapFieldType("CustomType?")).toBe("Schema.optional(Schema.String)")
  })
})
