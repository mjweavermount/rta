import { describe, expect, it } from "vitest"
import { Effect, Schema } from "effect"
import {
  ContextFactory,
  defineDomainEvent,
  defineCommand,
  type Command,
  type DomainEvent,
  type OperationScope,
  DomainError,
} from "@rta/core"
import {
  InstrumentedCommandHandler,
  InstrumentedEventHandler,
  InstrumentedOutboundAdapter,
  createReadableLogBuffer,
  subscribePrimitiveLifecycle,
} from "../src/index.js"

const DoWork = defineCommand("DoWork", Schema.Struct({ id: Schema.NonEmptyString }))
type DoWorkCommand = Command<"DoWork", { readonly id: string }>
const WorkDone = defineDomainEvent("WorkDone", Schema.Struct({ id: Schema.NonEmptyString }))
type WorkDoneEvent = DomainEvent<"WorkDone", { readonly id: string }>

class DoWorkHandler extends InstrumentedCommandHandler<DoWorkCommand> {
  constructor(private readonly fail = false) {
    super("DoWorkHandler", "TestContext")
  }

  protected executeCommand(_command: DoWorkCommand, scope: OperationScope): Effect.Effect<void, DomainError> {
    if (this.fail) {
      return Effect.fail(new DomainError({ message: "nope" }))
    }
    return scope.requireCommit().pipe(Effect.asVoid)
  }
}

class PublishDigestAdapter extends InstrumentedOutboundAdapter<
  { readonly digestId: string },
  { readonly staged: true }
> {
  constructor() {
    super("PublishDigestAdapter", "MeetingDigest")
  }

  protected summarize(input: { readonly digestId: string }) {
    return {
      action: `Stage publication ${input.digestId}`,
      reason: "human review approved the digest",
      with: ["AFFiNE", "Plane"],
      input: input.digestId,
      output: "dry-run external writes staged",
    }
  }

  protected execute(): Effect.Effect<{ readonly staged: true }, DomainError> {
    return Effect.succeed({ staged: true })
  }
}

class WorkDoneProjector extends InstrumentedEventHandler<WorkDoneEvent> {
  constructor(private readonly fail = false) {
    super("WorkDoneProjector", "TestContext")
  }

  protected summarizeEvent(event: WorkDoneEvent) {
    return {
      action: `Project ${event.payload.id}`,
      reason: "work completion should update the read model",
      with: ["read model"],
      input: event._tag,
      output: "projection updated",
    }
  }

  protected executeEvent(_event: WorkDoneEvent): Effect.Effect<void, DomainError> {
    return this.fail
      ? Effect.fail(new DomainError({ message: "projection failed" }))
      : Effect.void
  }
}

describe("InstrumentedCommandHandler", () => {
  it("emits required operation phases around the protected hook", async () => {
    const phases: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "command-handler" && event.primitiveName === "DoWorkHandler") {
        phases.push(event.phase)
      }
    })

    const command = await Effect.runPromise(DoWork.make({ id: "work-1" }))
    const scope = new ContextFactory(
      undefined,
      { uuid: () => "fixed-id" },
    )
      .createExternal({ actorId: "virgil" })
      .promote("internal", { message: "validated" })
      .promote("command", { message: "execute command" })

    await Effect.runPromise(new DoWorkHandler().handle(command, scope))
    unsubscribe()

    expect(phases).toEqual(["received", "started", "completed"])
  })

  it("emits failed when the protected hook fails", async () => {
    const phases: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "command-handler" && event.primitiveName === "DoWorkHandler") {
        phases.push(event.phase)
      }
    })

    const command = await Effect.runPromise(DoWork.make({ id: "work-1" }))
    const scope = new ContextFactory(undefined, { uuid: () => "fixed-id" })
      .createExternal({ actorId: "virgil" })
      .promote("internal", { message: "validated" })
      .promote("command", { message: "execute command" })

    await Effect.runPromise(Effect.either(new DoWorkHandler(true).handle(command, scope)))
    unsubscribe()

    expect(phases).toEqual(["received", "started", "failed"])
  })
})

describe("InstrumentedPrimitive", () => {
  it("makes non-handler primitives speak through the same operation event stream", async () => {
    const logs = createReadableLogBuffer({ verbosity: "trace" })
    const scope = new ContextFactory(undefined, { uuid: () => "fixed-id" })
      .createExternal({ actorId: "virgil" })
      .promote("internal", { message: "validated" })

    const result = await Effect.runPromise(
      new PublishDigestAdapter().invoke({ digestId: "digest-1" }, scope),
    )
    logs.stop()

    expect(result.staged).toBe(true)
    expect(logs.entries.map((entry) => entry.event.phase)).toEqual([
      "received",
      "started",
      "completed",
    ])
    expect(logs.entries[1]?.line).toContain(
      "[trace] PUBLISH_DIGEST_ADAPTER Started outbound adapter Stage publication digest-1 because human review approved the digest with AFFiNE and Plane",
    )
    expect(logs.entries[1]?.line).toContain("correlationId=fixed-id")
  })
})

describe("InstrumentedEventHandler", () => {
  it("emits required operation phases around event projection", async () => {
    const phases: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "event-handler" && event.primitiveName === "WorkDoneProjector") {
        phases.push(event.phase)
      }
    })

    const domainEvent = await Effect.runPromise(WorkDone.make({ id: "work-1" }))
    const scope = new ContextFactory(undefined, { uuid: () => "fixed-id" })
      .createExternal({ actorId: "virgil" })
      .promote("internal", { message: "project event" })

    await Effect.runPromise(new WorkDoneProjector().handle(domainEvent, scope))
    unsubscribe()

    expect(phases).toEqual(["received", "started", "completed"])
  })

  it("emits failed when event projection fails", async () => {
    const logs = createReadableLogBuffer({ verbosity: "normal" })
    const domainEvent = await Effect.runPromise(WorkDone.make({ id: "work-1" }))
    const scope = new ContextFactory(undefined, { uuid: () => "fixed-id" })
      .createExternal({ actorId: "virgil" })
      .promote("internal", { message: "project event" })

    await Effect.runPromise(Effect.either(new WorkDoneProjector(true).handle(domainEvent, scope)))
    logs.stop()

    expect(logs.entries.map((entry) => entry.event.phase)).toEqual([
      "received",
      "started",
      "failed",
    ])
    expect(logs.entries[2]?.line).toContain("[normal] WORK_DONE_PROJECTOR Failed event handler Project work-1")
  })
})
