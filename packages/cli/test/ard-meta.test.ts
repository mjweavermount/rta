import { describe, expect, it } from "vitest"
import { validateArdMetadata } from "../src/ard/meta.js"
import type { ArdDeclaration } from "../src/ard/schema.js"

const SPIRIT: ArdDeclaration = {
  id: "ARD-T2-000",
  kind: "spirit",
  family: "t2",
  name: "Tier 2 patterns",
  description: "Umbrella spirit ARD",
  spirit: ["README.md#ards"],
  severity: "error",
  checks: [],
  letters: ["ARD-T2-001"],
}

const LETTER: ArdDeclaration = {
  id: "ARD-T2-001",
  kind: "letter",
  family: "t2",
  name: "Pattern specs valid",
  description: "Mechanical enforcement",
  spirit: ["ARD-T2-000"],
  severity: "error",
  checks: [{ description: "check", command: "echo ok" }],
}

describe("validateArdMetadata", () => {
  it("accepts reciprocal spirit and letter metadata", () => {
    expect(validateArdMetadata([SPIRIT, LETTER])).toEqual([])
  })

  it("rejects letters without an in-repo spirit reference", () => {
    const issues = validateArdMetadata([
      { ...LETTER, spirit: ["TIERS.md#tier-2--patterns"] },
    ])
    expect(issues.some((issue) => issue.message.includes("in-repo spirit"))).toBe(true)
  })

  it("rejects spirit ARDs whose letters do not reciprocate", () => {
    const issues = validateArdMetadata([
      SPIRIT,
      { ...LETTER, spirit: ["README.md#ards"] },
    ])
    expect(issues.some((issue) => issue.message.includes("reciprocally"))).toBe(true)
  })
})
