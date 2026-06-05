import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { Effect } from "effect"
import { checkCoverageWaivers } from "../src/check-coverage-waivers.js"

let root: string

const run = () => Effect.runPromise(checkCoverageWaivers(root))

const write = (path: string, content: string) => {
  const fullPath = join(root, path)
  mkdirSync(fullPath.replace(/\/[^/]+$/, ""), { recursive: true })
  writeFileSync(fullPath, content)
}

const summary = (path: string, pct: number) => ({
  total: {
    lines: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    statements: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    functions: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    branches: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
  },
  [join(root, path)]: {
    lines: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    statements: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    functions: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
    branches: { total: 1, covered: pct === 100 ? 1 : 0, skipped: 0, pct },
  },
})

describe("coverage waivers", () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "rta-coverage-waivers-"))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("accepts 100% coverage without waivers", async () => {
    write("src/tool.ts", "export const x = 1\n")
    write("coverage/coverage-summary.json", JSON.stringify(summary("src/tool.ts", 100)))

    await expect(run()).resolves.toEqual([])
  })

  it("requires a waiver for uncovered authored files", async () => {
    write("src/tool.ts", "export const x = 1\n")
    write("coverage/coverage-summary.json", JSON.stringify(summary("src/tool.ts", 75)))

    const errors = await run()
    expect(errors).toContain("src/tool.ts: lines coverage is 75; requires 100% or a coverage waiver")
  })

  it("accepts an explicit non-expired waiver with a replacement check", async () => {
    write("src/tool.ts", "export const x = 1\n")
    write("coverage/coverage-summary.json", JSON.stringify(summary("src/tool.ts", 75)))
    write(
      "testing/coverage-waivers.yaml",
      `
waivers:
  - id: COV-TEST-001
    path: src/tool.ts
    reason: Covered by a live smoke scenario that cannot be represented in unit coverage yet.
    owner: mjweaver
    expires: 2099-01-01
    replacementCheck: pnpm test:live-smoke
    risk: medium
`,
    )

    await expect(run()).resolves.toEqual([])
  })

  it("rejects expired waivers and waivers without replacement checks", async () => {
    write("src/tool.ts", "export const x = 1\n")
    write("coverage/coverage-summary.json", JSON.stringify(summary("src/tool.ts", 75)))
    write(
      "testing/coverage-waivers.yaml",
      `
waivers:
  - id: COV-TEST-001
    path: src/tool.ts
    reason: Missing replacement check should fail.
    owner: mjweaver
    expires: 2020-01-01
    replacementCheck: ""
    risk: medium
`,
    )

    const errors = await run()
    expect(errors).toContain("COV-TEST-001: missing replacementCheck")
    expect(errors).toContain("COV-TEST-001: waiver expired on 2020-01-01")
  })
})
