import { describe, expect, it } from "vitest"
import {
  FakeAffineClient,
  InMemorySecretBackend,
  createFakeGatewayDeps,
  executeTool,
  type ToolName,
} from "../src/index.js"

const readTools: ReadonlyArray<ToolName> = [
  "affine.current_user",
  "affine.list_workspaces",
  "affine.recent_docs",
  "affine.schema_summary",
]

describe("affine ops gateway", () => {
  it("runs affine.ping without credentials", () => {
    const result = executeTool({ name: "affine.ping" }, {
      secrets: new InMemorySecretBackend(),
      affine: new FakeAffineClient(),
    })

    expect(result.status).toBe("completed")
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
})
