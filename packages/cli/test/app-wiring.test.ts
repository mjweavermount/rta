import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildWiringGraph, checkAppWiring } from "../src/app-wiring.js"
import { Effect } from "effect"
import { readVocabFile } from "@rta/vocab"

const repoRoot = join(import.meta.dirname, "../../..")

describe("checkAppWiring", () => {
  it("passes the golden fixture app wiring", async () => {
    await expect(checkAppWiring(join(repoRoot, "fixtures/golden/pass"))).resolves.toBe(0)
  })

  it("fails when an entrypoint references a missing operation", async () => {
    await expect(
      checkAppWiring(join(repoRoot, "fixtures/golden/fail/app-wiring-missing-operation")),
    ).resolves.toBe(1)
  })

  it("builds an entrypoint graph from app wiring", async () => {
    const parsed = await Effect.runPromise(
      readVocabFile(join(repoRoot, "fixtures/golden/pass/vocab/contexts/billing.context.yaml")),
    )
    if (parsed.kind !== "BoundedContext") throw new Error("expected BoundedContext")
    const graph = buildWiringGraph([parsed])

    expect(graph.entries).toContainEqual({
      context: "Billing",
      wiring: "BillingAppWiring",
      entrypoint: "AffineCurrentUserTool",
      kind: "mcp-tool",
      surface: "AffineMcp",
      tool: "affine.current_user",
      adapterBinding: "LocalAffineDocumentBinding",
      inputSchema: "AffineDocReadInput",
      operation: "GetInvoice",
      runtimeCapabilities: ["AffineGraphqlClient"],
      deploymentIntent: "BillingLocalContainer",
      demo: "pnpm --filter @rta/example-affine-ops-gateway run demo:fake",
    })
  })
})

