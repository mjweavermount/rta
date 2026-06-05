import { describe, it, expect } from "vitest"
import { Effect, Schema } from "effect"
import {
  CommandHandlerTypeId,
  ConnectionMap,
  EventHandlerTypeId,
  defineStrictDomainEvent,
  defineStrictCommand,
  defineStrictQuery,
  instrumentProcessManagerTransition,
  instrumentReaction,
  instrumentDecision,
  makeConnectionMapLayer,
  makeRootContext,
  registerDecisionCaptureCallback,
  registerEventCaptureCallback,
  registerProcessManagerCaptureCallback,
  registerReactionCaptureCallback,
  registerRuleCaptureCallback,
  strictPublish,
  subscribePrimitiveLifecycle,
  withOtelCommandHandler,
  withOtelEventHandler,
  withOtelQueryHandler,
  withRules,
} from "../src/index.js"
import {
  QueryHandlerTypeId,
  makeDecision,
  makeProcessManager,
  makeReaction,
  makeRule,
  outcome,
  ruleViolation,
  transitionProcessManager,
} from "@rta/core"

const run = <A>(e: Effect.Effect<A, any>) => Effect.runPromise(e)
const runWithConnectionMap = <A>(e: Effect.Effect<A, any, ConnectionMap>) =>
  Effect.runPromise(e.pipe(Effect.provide(makeConnectionMapLayer([
    {
      kind: "Connections" as const,
      context: "Booking",
      publishes: [{ event: "AppointmentBooked", to: ["Reminder"] }],
      subscribes: [],
    },
  ]))))

describe("primitive lifecycle telemetry", () => {
  it("emits rule lifecycle phases for pass and fail cases", async () => {
    const events: Array<{ name: string; phase: string; violation?: string }> = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "rule") {
        events.push({
          name: event.primitiveName,
          phase: event.phase,
          violation: event.violation,
        })
      }
    })

    const passRule = makeRule("AppointmentMustBePending", (input: { status: string }) =>
      input.status === "pending"
        ? Effect.void
        : Effect.fail(ruleViolation("AppointmentNotPending", "AppointmentMustBePending")),
    )
    const failRule = makeRule("AppointmentMustBePending", (input: { status: string }) =>
      input.status === "pending"
        ? Effect.void
        : Effect.fail(ruleViolation("AppointmentNotPending", "AppointmentMustBePending")),
    )

    const passHandler = withRules(
      [passRule],
      "Appointment",
      "Booking",
      () => Effect.succeed("ok"),
    )
    const failHandler = withRules(
      [failRule],
      "Appointment",
      "Booking",
      () => Effect.succeed("ok"),
    )

    await run(passHandler({ status: "pending" }))
    await run(Effect.either(failHandler({ status: "cancelled" })))
    unsubscribe()

    expect(events).toEqual([
      { name: "AppointmentMustBePending", phase: "received", violation: undefined },
      { name: "AppointmentMustBePending", phase: "completed", violation: undefined },
      { name: "AppointmentMustBePending", phase: "received", violation: undefined },
      { name: "AppointmentMustBePending", phase: "failed", violation: "AppointmentNotPending" },
    ])
  })

  it("emits decision lifecycle phases with the selected outcome", async () => {
    const events: Array<{ phase: string; outcome?: string }> = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "decision") {
        events.push({ phase: event.phase, outcome: event.outcome })
      }
    })

    const decision = makeDecision("AppointmentPriorityDecision", (input: { urgent: boolean }) =>
      Effect.succeed(input.urgent ? outcome("Urgent") : outcome("Routine")),
    )

    const result = await run(instrumentDecision(decision, { urgent: true }, "Booking"))
    unsubscribe()

    expect(result._tag).toBe("Urgent")
    expect(events).toEqual([
      { phase: "received", outcome: undefined },
      { phase: "completed", outcome: "Urgent" },
    ])
  })

  it("projects lifecycle events through the legacy rule and decision capture APIs", async () => {
    const captures: string[] = []

    registerRuleCaptureCallback((name, _aggregate, _context, passed, violation) => {
      captures.push(`rule:${name}:${passed ? "pass" : violation}`)
    })
    registerDecisionCaptureCallback((name, _context, outcome) => {
      captures.push(`decision:${name}:${outcome}`)
    })

    const rule = makeRule("AppointmentMustBePending", (input: { status: string }) =>
      input.status === "pending"
        ? Effect.void
        : Effect.fail(ruleViolation("AppointmentNotPending", "AppointmentMustBePending")),
    )
    const decision = makeDecision("AppointmentPriorityDecision", () =>
      Effect.succeed(outcome("Routine")),
    )

    const handler = withRules([rule], "Appointment", "Booking", () => Effect.succeed("ok"))
    await run(handler({ status: "pending" }))
    await run(instrumentDecision(decision, { status: "pending" }, "Booking"))

    expect(captures).toEqual([
      "rule:AppointmentMustBePending:pass",
      "decision:AppointmentPriorityDecision:Routine",
    ])
  })

  it("emits reaction lifecycle phases and preserves the legacy reaction capture projection", async () => {
    const phases: string[] = []
    const captures: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "reaction") {
        phases.push(`${event.phase}:${event.emittedCommands.join(",")}`)
      }
    })
    registerReactionCaptureCallback((name, triggerEvent, from, to, emittedCommands) => {
      captures.push(`${name}:${triggerEvent}:${from}->${to}:${emittedCommands.join(",")}`)
    })

    const reaction = makeReaction(
      "ReserveInventoryOnOrderPlaced",
      "OrderPlaced",
      () => Effect.succeed([{ _tag: "ReserveInventory" }]),
    )

    const commands = await run(
      instrumentReaction(reaction, { _tag: "OrderPlaced" }, {
        context: "OrderManagement",
        from: "OrderManagement",
        to: "InventoryContext",
      }),
    )
    unsubscribe()

    expect(commands).toHaveLength(1)
    expect(phases).toEqual([
      "received:",
      "emitted:ReserveInventory",
      "completed:ReserveInventory",
    ])
    expect(captures).toEqual([
      "ReserveInventoryOnOrderPlaced:OrderPlaced:OrderManagement->InventoryContext:ReserveInventory",
    ])
  })

  it("emits process-manager transition phases and preserves the legacy process-manager capture projection", async () => {
    const phases: string[] = []
    const captures: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "process-manager") {
        phases.push(`${event.phase}:${event.emittedCommands?.join(",") ?? ""}:${event.terminal === true}`)
      }
    })
    registerProcessManagerCaptureCallback((name, context, triggerEvent, _prevState, nextState, emittedCommands) => {
      captures.push(`${name}:${context}:${triggerEvent}:${String(nextState["status"])}:${emittedCommands.join(",")}`)
    })

    const pm = makeProcessManager<
      string,
      { status: string },
      { readonly _tag: "AppointmentBooked" },
      { readonly _tag: "InitiatePayment" }
    >("pm-1", { status: "idle" })

    const updated = await run(
      instrumentProcessManagerTransition(
        "AppointmentFulfillmentManager",
        "Booking",
        pm,
        { _tag: "AppointmentBooked" },
        (current) =>
          Effect.succeed(
            transitionProcessManager(
              current,
              { status: "payment-pending" },
              [{ _tag: "InitiatePayment" }],
              { terminal: false },
            ),
          ),
      ),
    )
    unsubscribe()

    expect(updated.pendingCommands).toHaveLength(1)
    expect(phases).toEqual([
      "received::false",
      "state-changed::false",
      "emitted:InitiatePayment:false",
      "completed:InitiatePayment:false",
    ])
    expect(captures).toEqual([
      "AppointmentFulfillmentManager:Booking:AppointmentBooked:payment-pending:InitiatePayment",
    ])
  })

  it("emits command, query, and event handler execution phases through the strict wrappers", async () => {
    const events: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (
        event.primitiveType === "command-handler" ||
        event.primitiveType === "query-handler" ||
        event.primitiveType === "event-handler"
      ) {
        events.push(`${event.primitiveType}:${event.phase}:${event.primitiveName}`)
      }
    })

    const root = makeRootContext("user-1")
    const PlaceOrder = defineStrictCommand("PlaceOrder", Schema.Struct({ orderId: Schema.NonEmptyString }))
    const GetOrder = defineStrictQuery(
      "GetOrder",
      Schema.Struct({ orderId: Schema.NonEmptyString }),
      Schema.Struct({ status: Schema.NonEmptyString }),
    )
    const OrderPlaced = defineStrictDomainEvent("OrderPlaced", Schema.Struct({ orderId: Schema.NonEmptyString }))

    const command = await run(PlaceOrder.make({ orderId: "ord-1" }, root))
    const query = await run(GetOrder.make({ orderId: "ord-1" }, root))
    const domainEvent = await run(
      OrderPlaced.make(
        { orderId: "ord-1" },
        { context: root, aggregateId: "ord-1", aggregateType: "Order" },
      ),
    )

    const commandHandler = withOtelCommandHandler(
      {
        [CommandHandlerTypeId]: CommandHandlerTypeId,
        handle: () => Effect.void,
      },
      { context: "Ordering", name: "PlaceOrderHandler" },
    )
    const queryHandler = withOtelQueryHandler(
      {
        [QueryHandlerTypeId]: QueryHandlerTypeId,
        handle: () => Effect.succeed({ status: "placed" }),
      },
      { context: "Ordering", name: "GetOrderHandler" },
    )
    const eventHandler = withOtelEventHandler(
      {
        [EventHandlerTypeId]: EventHandlerTypeId,
        handle: () => Effect.void,
      },
      { context: "Ordering", name: "OrderPlacedProjector" },
    )

    await run(commandHandler.handle(command))
    await run(queryHandler.handle(query))
    await run(eventHandler.handle(domainEvent))
    unsubscribe()

    expect(events).toEqual([
      "command-handler:received:PlaceOrderHandler",
      "command-handler:started:PlaceOrderHandler",
      "command-handler:completed:PlaceOrderHandler",
      "query-handler:received:GetOrderHandler",
      "query-handler:started:GetOrderHandler",
      "query-handler:completed:GetOrderHandler",
      "event-handler:received:OrderPlacedProjector",
      "event-handler:started:OrderPlacedProjector",
      "event-handler:completed:OrderPlacedProjector",
    ])
  })

  it("emits event lifecycle telemetry on permitted publish and projects it through the legacy event capture API", async () => {
    const events: Array<{ phase: string; name: string; to: string }> = []
    const legacy: string[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => {
      if (event.primitiveType === "event") {
        events.push({ phase: event.phase, name: event.primitiveName, to: event.to })
      }
    })

    registerEventCaptureCallback((name, _from, to) => {
      legacy.push(`${name}->${to}`)
    })

    const AppointmentBooked = defineStrictDomainEvent(
      "AppointmentBooked",
      Schema.Struct({ appointmentId: Schema.NonEmptyString }),
    )
    const event = await run(
      AppointmentBooked.make(
        { appointmentId: "apt-1" },
        {
          context: {
            correlationId: "corr-1",
            causationId: "cause-1",
            issuedBy: "test",
            issuedAt: new Date(),
          },
          aggregateId: "apt-1",
          aggregateType: "Appointment",
        },
      ),
    )

    await runWithConnectionMap(strictPublish(event, "Booking", "Reminder"))
    unsubscribe()

    expect(events).toEqual([{ phase: "emitted", name: "AppointmentBooked", to: "Reminder" }])
    expect(legacy).toEqual(["AppointmentBooked->Reminder"])
  })
})
