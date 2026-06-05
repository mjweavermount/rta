import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseArdContent, ArdParseError } from "../src/ard/schema.js"

const run = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(e)
const runFail = <A>(e: Effect.Effect<A, any>) =>
  Effect.runPromise(Effect.flip(e))

const VALID_ARD = `
id: ARD-001
kind: letter
family: custom
name: "No direct cross-context imports"
spirit: [ARD-CUSTOM-000]
severity: error
checks:
  - description: "Run dependency-cruiser"
    command: "echo ok"
`

describe("parseArdContent", () => {
  it("parses a valid ARD declaration", async () => {
    const ard = await run(parseArdContent(VALID_ARD))
    expect(ard.id).toBe("ARD-001")
    expect(ard.kind).toBe("letter")
    expect(ard.family).toBe("custom")
    expect(ard.name).toBe("No direct cross-context imports")
    expect(ard.spirit).toEqual(["ARD-CUSTOM-000"])
    expect(ard.severity).toBe("error")
    expect(ard.checks).toHaveLength(1)
    expect(ard.checks[0]!.description).toBe("Run dependency-cruiser")
    expect(ard.checks[0]!.command).toBe("echo ok")
  })

  it("parses an ARD with warn severity", async () => {
    const ard = await run(
      parseArdContent(`
id: ARD-002
kind: letter
family: custom
name: "Warn check"
spirit: ARD-CUSTOM-000
severity: warn
checks:
  - description: "check"
    command: "echo warn"
`),
    )
    expect(ard.severity).toBe("warn")
    expect(ard.spirit).toEqual(["ARD-CUSTOM-000"])
  })

  it("parses an ARD with optional description", async () => {
    const ard = await run(
      parseArdContent(`
id: ARD-003
kind: spirit
family: custom
name: "With description"
description: "Some description"
spirit: [README.md#ards]
severity: error
checks: []
letters: [ARD-004]
`),
    )
    expect(ard.description).toBe("Some description")
    expect(ard.kind).toBe("spirit")
    expect(ard.letters).toEqual(["ARD-004"])
  })

  it("parses an ARD with multiple checks", async () => {
    const ard = await run(
      parseArdContent(`
id: ARD-004
kind: letter
family: custom
name: "Multi-check"
spirit: [ARD-003]
severity: error
checks:
  - description: "check 1"
    command: "echo 1"
  - description: "check 2"
    command: "echo 2"
`),
    )
    expect(ard.checks).toHaveLength(2)
  })

  it("fails with ArdParseError for missing id", async () => {
    const err = await runFail(
      parseArdContent(`
name: "Missing id"
kind: letter
family: custom
spirit: [ARD-CUSTOM-000]
severity: error
checks:
  - description: "check"
    command: "echo ok"
`),
    )
    expect(err._tag).toBe("ArdParseError")
  })

  it("fails with ArdParseError for invalid severity", async () => {
    const err = await runFail(
      parseArdContent(`
id: ARD-X
kind: letter
family: custom
name: "Bad severity"
spirit: [ARD-CUSTOM-000]
severity: critical
checks:
  - description: "check"
    command: "echo ok"
`),
    )
    expect(err._tag).toBe("ArdParseError")
  })

  it("allows empty checks arrays for metadata-only spirit ARDs", async () => {
    const ard = await run(
      parseArdContent(`
id: ARD-CUSTOM-000
kind: spirit
family: custom
name: "Metadata only"
spirit: [README.md#ards]
severity: error
checks: []
letters: [ARD-001]
`),
    )
    expect(ard.checks).toEqual([])
  })

  it("fails with ArdParseError when kind is missing", async () => {
    const err = await runFail(
      parseArdContent(`
id: ARD-X
name: "No checks"
family: custom
severity: error
spirit: [ARD-CUSTOM-000]
checks:
  - description: "check"
    command: "echo ok"
`),
    )
    expect(err._tag).toBe("ArdParseError")
  })

  it("fails with ArdParseError for malformed YAML", async () => {
    const err = await runFail(parseArdContent("{{not: valid: yaml"))
    expect(err._tag).toBe("ArdParseError")
  })

  it("ArdParseError message includes the path", async () => {
    const err = await runFail(
      parseArdContent("not: yaml:", "my-ard.yaml"),
    )
    expect(err.message).toContain("my-ard.yaml")
  })
})
