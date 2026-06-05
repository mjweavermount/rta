import { describe, expect, it } from "vitest"
import { Effect, Schema } from "effect"
import {
  CommandBus,
  ContextFactory,
  defineCommand,
  defineDomainEvent,
  defineQuery,
  EventBus,
  HandlerNotRegistered,
  QueryBus,
  type Command,
  type DomainEvent,
  type OperationScope,
  type Query,
} from "../src/index.js"

const DoWork = defineCommand("DoWork", Schema.Struct({ id: Schema.NonEmptyString }))
type DoWorkCommand = Command<"DoWork", { readonly id: string }>

const WorkDone = defineDomainEvent("WorkDone", Schema.Struct({ id: Schema.NonEmptyString }))
type WorkDoneEvent = DomainEvent<"WorkDone", { readonly id: string }>

const GetWork = defineQuery(
  "GetWork",
  Schema.Struct({ id: Schema.NonEmptyString }),
  Schema.Struct({ id: Schema.NonEmptyString, status: Schema.NonEmptyString }),
)
type GetWorkQuery = Query<"GetWork", { readonly id: string }, { readonly id: string; readonly status: string }>

const run = <A>(e: Effect.Effect<A, any, any>) => Effect.runPromise(e)
const scope = new ContextFactory(undefined, { uuid: () => "fixed-id" })
  .createExternal({ actorId: "virgil" })
  .promote("internal", { message: "dispatch" })
  .promote("command", { message: "command dispatch" })

describe("CQRS buses", () => {
  it("dispatches commands through scoped handlers", async () => {
    const seen: string[] = []
    const command = await run(DoWork.make({ id: "work-1" }))
    const bus = new CommandBus().register("DoWork", {
      handle: (message: DoWorkCommand, operationScope: OperationScope) =>
        Effect.sync(() => {
          seen.push(`${message.payload.id}:${operationScope.identity.actorId}`)
        }),
    })

    await run(bus.dispatch(command, scope))

    expect(seen).toEqual(["work-1:virgil"])
  })

  it("dispatches queries and preserves their result type", async () => {
    const query = await run(GetWork.make({ id: "work-1" }))
    const bus = new QueryBus().register("GetWork", {
      handle: (_message: GetWorkQuery) =>
        Effect.succeed({ id: "work-1", status: "done" }),
    })

    const result = await run(bus.dispatch(query, scope))

    expect(result.status).toBe("done")
  })

  it("publishes events to all scoped event handlers", async () => {
    const seen: string[] = []
    const event = await run(WorkDone.make({ id: "work-1" }))
    const bus = new EventBus()
      .register("WorkDone", {
        handle: (message: WorkDoneEvent) => Effect.sync(() => seen.push(`a:${message.payload.id}`)),
      })
      .register("WorkDone", {
        handle: (message: WorkDoneEvent) => Effect.sync(() => seen.push(`b:${message.payload.id}`)),
      })

    await run(bus.publish(event, scope))

    expect(seen).toEqual(["a:work-1", "b:work-1"])
  })

  it("fails explicitly when no handler is registered", async () => {
    const command = await run(DoWork.make({ id: "work-1" }))
    const failure = await run(Effect.either(new CommandBus().dispatch(command, scope)))

    expect(failure._tag).toBe("Left")
    if (failure._tag === "Left") {
      expect(failure.left).toBeInstanceOf(HandlerNotRegistered)
      expect(failure.left.message).toContain("command handler not registered")
    }
  })
})
