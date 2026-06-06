import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { checkTraceContext } from "../src/check-trace-context.js"

describe("checkTraceContext", () => {
  it("passes the repository trace-context contract", async () => {
    await expect(checkTraceContext(join(import.meta.dirname, "../../.."))).resolves.toBe(0)
  })

  it("fails when a required ID contract file is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-trace-context-"))
    await expect(checkTraceContext(root)).resolves.toBe(1)
  })

  it("fails when strict query tests stop proving causation IDs", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-trace-context-"))
    const path = join(root, "packages/strict/test/factories.test.ts")
    await mkdir(join(root, "packages/strict/test"), { recursive: true })
    await writeFile(path, "expect(q.messageId).toEqual(expect.any(String))\nexpect(q.issuedAt).toBeInstanceOf(Date)\n", "utf8")

    await expect(checkTraceContext(root)).resolves.toBe(1)
  })
})
