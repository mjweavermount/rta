import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  FakeAffineClient,
  InMemorySecretBackend,
  createFakeGatewayDeps,
  executeTool,
  runTool,
  type ToolName,
} from "../src/index.js"
import { runCli } from "../src/cli.js"

const readTools: ReadonlyArray<ToolName> = [
  "affine.current_user",
  "affine.list_workspaces",
  "affine.recent_docs",
  "affine.schema_summary",
]

describe("affine ops gateway", () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "affine-ops-gateway-"))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("runs affine.ping without credentials", () => {
    const result = executeTool({ name: "affine.ping" }, {
      secrets: new InMemorySecretBackend(),
      affine: new FakeAffineClient(),
    })

    expect(result.status).toBe("completed")
    expect(result.receiptId).toBe("receipt-affine.ping")
    expect(result.summary).toContain("read-only service health")
  })

  it.each(readTools)("runs read-only tool %s with fake credentials", (name) => {
    const result = executeTool({ name }, createFakeGatewayDeps())

    expect(result.status).toBe("completed")
    expect(result.talksTo).toEqual(["SecretBackend", "AffineClient"])
    expect(result.data).toBeDefined()
  })

  it("reads a document by id", () => {
    const result = executeTool(
      { name: "affine.doc_read", input: { docId: "doc-1" } },
      createFakeGatewayDeps(),
    )

    expect(result.status).toBe("completed")
    expect(result.summary).toContain("doc-1")
  })

  it("rejects doc reads without a valid doc id", () => {
    const result = executeTool(
      { name: "affine.doc_read", input: { docId: "" } },
      createFakeGatewayDeps(),
    )

    expect(result.status).toBe("rejected")
  })

  it("denies credentialed reads when the secret backend has no token", () => {
    const result = executeTool(
      { name: "affine.current_user" },
      { secrets: new InMemorySecretBackend(), affine: new FakeAffineClient() },
    )

    expect(result.status).toBe("denied")
    expect(result.summary).toContain("credentials are missing")
  })

  it("keeps write tools fail-closed", () => {
    const result = executeTool({ name: "affine.doc_update" }, createFakeGatewayDeps())

    expect(result.status).toBe("fail-closed")
    expect(result.summary).toContain("write semantics are not approved")
  })

  it("writes a run artifact bundle", () => {
    const result = runTool(
      { name: "affine.current_user" },
      createFakeGatewayDeps(),
      {
        root,
        runId: "run-test",
        now: new Date("2026-06-05T00:00:00.000Z"),
        trace: true,
      },
    )

    const runRoot = join(root, ".rta", "runs", "run-test")
    expect(result.runRoot).toBe(runRoot)
    expect(existsSync(join(runRoot, "state.json"))).toBe(true)
    expect(readFileSync(join(runRoot, "readable.log"), "utf8")).toContain("affine.current_user completed")
    expect(readFileSync(join(runRoot, "operation-events.jsonl"), "utf8")).toContain("\"primitive\":\"tool-surface\"")
    expect(readFileSync(join(runRoot, "receipts.jsonl"), "utf8")).toContain("\"runId\":\"run-test\"")
  })

  it("writes default run metadata for fail-closed operations", () => {
    const result = runTool(
      { name: "affine.doc_update" },
      createFakeGatewayDeps(),
      {
        root,
        now: new Date("2026-06-05T00:00:00.000Z"),
      },
    )

    const state = JSON.parse(readFileSync(join(result.runRoot, "state.json"), "utf8")) as { status: string }
    expect(result.runId).toContain("run-affine.doc_update")
    expect(result.event.details).toEqual({ profile: "fake", trace: false, input: {} })
    expect(state.status).toBe("failed")
  })

  it("runs the local CLI with fake credentials", () => {
    const lines: string[] = []
    const code = runCli(["run", "affine.current_user", "--root", root], { log: (line) => lines.push(line) })

    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("affine.current_user")
  })

  it("reports doctor state and unknown tools", () => {
    const lines: string[] = []

    expect(runCli(["doctor", "--root", root], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["run", "affine.nope", "--root", root], { log: (line) => lines.push(line) })).toBe(1)
    expect(runCli(["help"], { log: (line) => lines.push(line) })).toBe(0)
    expect(runCli(["wat"], { log: (line) => lines.push(line) })).toBe(1)
    expect(lines.join("\n")).toContain("writes")
    expect(lines.join("\n")).toContain("unknown tool")
    expect(lines.join("\n")).toContain("usage:")
  })
})
