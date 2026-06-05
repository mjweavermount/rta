// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
import { Effect } from "effect"
import { NotFound } from "@rta/core"
import { InstrumentedCommandHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { ReleaseSlotCommand } from "./commands.js"
import { SlotRepository } from "./SlotRepository.js"

// ---------------------------------------------------------------------------
// ReleaseSlot handler
// ---------------------------------------------------------------------------

export class ReleaseSlotHandler extends InstrumentedCommandHandler<ReleaseSlotCommand, NotFound, SlotRepository> {
  constructor() {
    super("ReleaseSlotHandler", "Scheduling")
  }

  protected summarizeCommand(command: ReleaseSlotCommand): OperationSummary {
    return {
      action: "Handle ReleaseSlot",
      reason: "ReleaseSlot was routed to the Scheduling bounded context",
      with: ["SlotRepository"],
      input: command._tag,
      output: "domain events staged by command handler",
      lineage: ["context:Scheduling", "aggregate:Slot", "command:ReleaseSlot"],
    }
  }

  protected executeCommand(
    command: ReleaseSlotCommand,
    _scope: OperationScope,
  ): Effect.Effect<void, NotFound, SlotRepository> {
    return Effect.gen(function* () {
      const repo = yield* SlotRepository
      void repo // TODO: load aggregate with repo.findById(...)
      void command
      // TODO: apply business logic, raise events, save
      // Pattern:
      //   const agg = yield* repo.findById(command.payload.slotId)
      //   if (agg.data.someState === "invalid") yield* Effect.fail(new SomeDomainError(...))
      //   const event = yield* SomethingHappened.make({...}, { context: command, aggregateId: agg.id, aggregateType: "Slot" })
      //   const updated = raiseEvents(agg, event)
      //   yield* repo.save(updated)
    })
  }
}

export const handleReleaseSlot = (
  command: ReleaseSlotCommand,
  scope = new OperationScope({
    traceId: command._tag,
    operationId: command._tag,
    spanId: command._tag,
    trustLevel: "command",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => command._tag },
  }),
): Effect.Effect<void, NotFound, SlotRepository> =>
  new ReleaseSlotHandler().handle(command, scope)
