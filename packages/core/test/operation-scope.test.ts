import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import {
  CommitCap,
  ContextFactory,
  DomainError,
  PolicyToken,
  RawQueryCap,
  SimulatedClock,
  SimulatedRandom,
} from "../src/index.js"

describe("OperationScope", () => {
  it("creates deterministic external scopes", () => {
    const clock = new SimulatedClock(new Date("2026-01-02T03:04:05.000Z"))
    const random = new SimulatedRandom(["operation-1", "span-1"])
    const scope = new ContextFactory(clock, random).createExternal({ actorId: "virgil" })

    expect(scope.operationId).toBe("operation-1")
    expect(scope.traceId).toBe("operation-1")
    expect(scope.spanId).toBe("span-1")
    expect(scope.trustLevel).toBe("external")
    expect(scope.clock.now().toISOString()).toBe("2026-01-02T03:04:05.000Z")
  })

  it("promotes trust and mints write capabilities only at command level", async () => {
    const random = new SimulatedRandom(["operation-1", "span-1"])
    const external = new ContextFactory(undefined, random).createExternal({ actorId: "virgil" })
    const internal = external.promote("internal", { message: "validated input" })
    const command = internal.promote("command", { message: "handling command" })
    const system = command.promote("system", { message: "admin maintenance" })

    expect(internal.trustLevel).toBe("internal")
    expect(command.trustLevel).toBe("command")
    expect(system.trustLevel).toBe("system")
    await expect(Effect.runPromise(command.requireCommit())).resolves.toBeInstanceOf(CommitCap)
    await expect(Effect.runPromise(system.capabilities.require(RawQueryCap))).resolves.toBeInstanceOf(RawQueryCap)
  })

  it("requires explicit reasons for authority", () => {
    const random = new SimulatedRandom(["operation-1", "span-1"])
    const scope = new ContextFactory(undefined, random).createExternal({ actorId: "virgil" })

    expect(() => scope.promote("internal", { message: "  " })).toThrow(DomainError)
    expect(() => scope.authorize("CanChangeThing", { message: "" })).toThrow(DomainError)
    expect(scope.authorize("CanChangeThing", { message: "approved by policy" })).toBeInstanceOf(PolicyToken)
  })
})
