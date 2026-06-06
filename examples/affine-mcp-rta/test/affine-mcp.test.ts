import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { ContextFactory, SimulatedRandom } from "@rta/core"
import { subscribePrimitiveLifecycle, type PrimitiveLifecycleEvent } from "@rta/strict"
import { AffineMcpContext, createFakeAffineMcpDeps } from "../src/index.js"

const scope = () => new ContextFactory(
  undefined,
  new SimulatedRandom(["aff-op", "aff-span-1", "aff-span-2", "aff-span-3", "aff-span-4"]),
).createExternal({ actorId: "virgil-user" }).promote("internal", {
  message: "test affine mcp app",
})

describe("RTA AFFiNE MCP app", () => {
  it("builds context packs with primitive lifecycle logging", async () => {
    const events: PrimitiveLifecycleEvent[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => events.push(event))
    try {
      const result = await Effect.runPromise(new AffineMcpContext().invoke({
        call: {
          tool: "affine.context_pack",
          credentialKind: "user",
          input: { topic: "RTA MCP" },
        },
        deps: createFakeAffineMcpDeps(),
      }, scope()))

      expect(result.status).toBe("completed")
      expect(JSON.stringify(result.data)).toContain("do not duplicate chat history")
      expect(events.map((event) => event.primitiveType)).toEqual(expect.arrayContaining([
        "bounded-context",
        "edge-boundary",
        "policy",
        "outbound-adapter",
      ]))
    } finally {
      unsubscribe()
    }
  })

  it("stages source workbench edits instead of silently applying them", async () => {
    const result = await Effect.runPromise(new AffineMcpContext().invoke({
      call: {
        tool: "source.inline_edit_stage",
        credentialKind: "user",
        input: { target: "docs/spec.md", desired: "## Better Spec\n" },
      },
      deps: createFakeAffineMcpDeps(),
    }, scope()))

    expect(result.status).toBe("staged")
    expect(result.summary).toContain("staged an inline edit")
    expect(result.data).toMatchObject({ target: "docs/spec.md", staged: true })
  })

  it("keeps durable AFFiNE commits fail-closed until the writer is RTA-owned", async () => {
    await expect(Effect.runPromise(new AffineMcpContext().invoke({
      call: {
        tool: "affine.doc_commit",
        credentialKind: "user",
        input: {},
      },
      deps: createFakeAffineMcpDeps(),
    }, scope()))).rejects.toMatchObject({
      message: "AFFiNE durable document commit is fail-closed until the writer backend is RTA-owned and demo-covered.",
    })
  })

  it("rejects missing required tool input through the edge boundary", async () => {
    await expect(Effect.runPromise(new AffineMcpContext().invoke({
      call: {
        tool: "affine.context_pack",
        credentialKind: "user",
        input: {},
      },
      deps: createFakeAffineMcpDeps(),
    }, scope()))).rejects.toMatchObject({
      message: "topic is required",
    })
  })
})
