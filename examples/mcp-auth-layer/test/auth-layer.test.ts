import { describe, expect, it } from "vitest"
import { ContextFactory, SimulatedRandom } from "@rta/core"
import { subscribePrimitiveLifecycle, type PrimitiveLifecycleEvent } from "@rta/strict"
import { Effect } from "effect"
import { McpAuthLayerContext, createFakeMcpAuthDeps } from "../src/index.js"

const scope = () => new ContextFactory(
  undefined,
  new SimulatedRandom(["op-1", "span-1", "span-2", "span-3", "span-4", "span-5", "span-6"]),
).createExternal({ actorId: "virgil-user", displayName: "Virgil" }).promote("internal", {
  message: "test mcp auth layer",
})

describe("RTA MCP auth layer", () => {
  it("routes an authenticated tool call through RTA primitives", async () => {
    const events: PrimitiveLifecycleEvent[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => events.push(event))
    try {
      const result = await Effect.runPromise(new McpAuthLayerContext().invoke({
        raw: {
          service: "affine",
          tool: "current_user",
          actor: {
            subject: "authentik-user-1",
            email: "virgil@virgil.info",
            groups: ["lab-users"],
          },
        },
        deps: createFakeMcpAuthDeps(),
      }, scope()))

      expect(result.status).toBe("forwarded")
      expect(result.credentialKind).toBe("user")
      expect(events.map((event) => event.primitiveType)).toEqual(expect.arrayContaining([
        "bounded-context",
        "inbound-adapter",
        "edge-boundary",
        "policy",
        "secret",
        "outbound-adapter",
      ]))
      expect(events.find((event) => event.primitiveName === "CredentialBroker")?.summary?.reason)
        .toContain("credential custody")
    } finally {
      unsubscribe()
    }
  })

  it("fails closed before credential lookup for blocked tools", async () => {
    await expect(Effect.runPromise(new McpAuthLayerContext().invoke({
      raw: {
        service: "affine",
        tool: "doc_update",
        actor: {
          subject: "authentik-user-1",
          email: "virgil@virgil.info",
          groups: ["lab-users"],
        },
      },
      deps: createFakeMcpAuthDeps(),
    }, scope()))).rejects.toMatchObject({
      message: "AFFiNE write path is disabled until the RTA AFFiNE MCP app owns it.",
    })
  })
})
