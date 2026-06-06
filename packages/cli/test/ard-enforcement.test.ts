import { describe, expect, it } from "vitest"
import { formatArdEnforcementReport, validateArdEnforcement } from "../src/ard/enforcement.js"
import type { ArdDeclaration } from "../src/ard/schema.js"

const acceptedLetter = (command: string): ArdDeclaration => ({
  id: "ARD-CI-001",
  kind: "letter",
  family: "ci",
  name: "Accepted check",
  status: "accepted",
  spirit: ["ARD-CI-000"],
  severity: "error",
  checks: [{ description: "check", command }],
  enforcement: [{
    kind: "command",
    description: "check",
    command,
    expected: "pass",
  }],
})

describe("validateArdEnforcement", () => {
  it("accepts registered check commands", () => {
    expect(validateArdEnforcement([
      acceptedLetter("rta check --ard-meta && rta check --demo-coverage"),
    ])).toEqual([])
  })

  it("accepts rta.js invocations used by golden fixture ARDs", () => {
    expect(validateArdEnforcement([
      acceptedLetter("node ../../../packages/cli/dist/rta.js check --ard-enforcement --root ."),
    ])).toEqual([])
  })

  it("rejects accepted ARDs that point at unknown check modes", () => {
    const issues = validateArdEnforcement([
      acceptedLetter("rta check --trace-context"),
    ])
    expect(issues).toEqual([
      {
        ardId: "ARD-CI-001",
        command: "rta check --trace-context",
        message: 'unknown rta check mode "--trace-context"',
      },
    ])
    expect(formatArdEnforcementReport(issues)).toContain("ARD enforcement violations")
  })

  it("allows proposed ARDs to name future enforcement without fake green", () => {
    expect(validateArdEnforcement([
      { ...acceptedLetter("rta check --trace-context"), status: "proposed" },
    ])).toEqual([])
  })
})
