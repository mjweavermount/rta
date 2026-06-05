import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Effect } from "effect"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { runInit } from "../src/init.js"

const run = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(e)

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), "rta-init-test-"))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe("runInit", () => {
  it("creates vocab/contexts directory", async () => {
    await run(runInit({ root: tmpRoot }))
    const entries = await readdir(join(tmpRoot, "vocab", "contexts"))
    expect(entries.length).toBeGreaterThan(0)
  })

  it("creates vocab/connections directory", async () => {
    await run(runInit({ root: tmpRoot }))
    const entries = await readdir(join(tmpRoot, "vocab", "connections"))
    expect(entries.length).toBeGreaterThan(0)
  })

  it("creates ards directory", async () => {
    await run(runInit({ root: tmpRoot }))
    const entries = await readdir(join(tmpRoot, "ards"))
    expect(entries.length).toBeGreaterThan(0)
  })

  it("writes AGENTS.md", async () => {
    await run(runInit({ root: tmpRoot }))
    const content = await readFile(join(tmpRoot, "AGENTS.md"), "utf-8")
    expect(content).toContain("Ṛta")
    expect(content).toContain("rta context")
    expect(content).toContain("rta check")
    expect(content).toContain("rta generate")
  })

  it("AGENTS.md includes the core workflow steps", async () => {
    await run(runInit({ root: tmpRoot }))
    const content = await readFile(join(tmpRoot, "AGENTS.md"), "utf-8")
    expect(content).toContain("Vocab first")
    expect(content).toContain("fire-and-forget")
  })

  it("writes example context yaml", async () => {
    await run(runInit({ root: tmpRoot }))
    const content = await readFile(
      join(tmpRoot, "vocab", "contexts", "example.context.yaml"),
      "utf-8",
    )
    expect(content).toContain("kind: BoundedContext")
  })

  it("writes example connections yaml", async () => {
    await run(runInit({ root: tmpRoot }))
    const content = await readFile(
      join(tmpRoot, "vocab", "connections", "example.connections.yaml"),
      "utf-8",
    )
    expect(content).toContain("kind: Connections")
  })

  it("writes example ARD yaml", async () => {
    await run(runInit({ root: tmpRoot }))
    const content = await readFile(join(tmpRoot, "ards", "ARD-001.ard.yaml"), "utf-8")
    expect(content).toContain("id: ARD-001")
    expect(content).toContain("severity: error")
  })

  it("does not overwrite existing files by default", async () => {
    await run(runInit({ root: tmpRoot }))
    const first = await readFile(join(tmpRoot, "AGENTS.md"), "utf-8")
    // Modify the file
    const { writeFile } = await import("node:fs/promises")
    await writeFile(join(tmpRoot, "AGENTS.md"), "custom content")
    // Run init again without --force
    await run(runInit({ root: tmpRoot }))
    const second = await readFile(join(tmpRoot, "AGENTS.md"), "utf-8")
    expect(second).toBe("custom content")
  })

  it("overwrites existing files with --force", async () => {
    await run(runInit({ root: tmpRoot }))
    const { writeFile } = await import("node:fs/promises")
    await writeFile(join(tmpRoot, "AGENTS.md"), "custom content")
    await run(runInit({ root: tmpRoot, force: true }))
    const content = await readFile(join(tmpRoot, "AGENTS.md"), "utf-8")
    expect(content).toContain("Ṛta")
    expect(content).not.toBe("custom content")
  })

  it("returns exit code 0", async () => {
    const code = await run(runInit({ root: tmpRoot }))
    expect(code).toBe(0)
  })
})
