// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Effect } from "effect"
import { NotFound, RepositoryError } from "@rta/core"
import { InstrumentedCommandHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { OpenSlotCommand } from "./commands.js"
import { SlotRepository } from "./SlotRepository.js"

// ---------------------------------------------------------------------------
// OpenSlot handler
// ---------------------------------------------------------------------------

export class OpenSlotHandler extends InstrumentedCommandHandler<OpenSlotCommand, NotFound | RepositoryError, SlotRepository> {
  constructor() {
    super("OpenSlotHandler", "Scheduling")
  }

  protected summarizeCommand(command: OpenSlotCommand): OperationSummary {
    return {
      action: "Handle OpenSlot",
      reason: "OpenSlot was routed to the Scheduling bounded context",
      with: ["SlotRepository"],
      input: command._tag,
      output: "domain events staged by command handler",
      lineage: ["context:Scheduling", "aggregate:Slot", "command:OpenSlot"],
    }
  }

  protected executeCommand(
    command: OpenSlotCommand,
    _scope: OperationScope,
  ): Effect.Effect<void, NotFound | RepositoryError, SlotRepository> {
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

export const handleOpenSlot = (
  command: OpenSlotCommand,
  scope = new OperationScope({
    traceId: command._tag,
    operationId: command._tag,
    spanId: command._tag,
    trustLevel: "command",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => command._tag },
  }),
): Effect.Effect<void, NotFound | RepositoryError, SlotRepository> =>
  new OpenSlotHandler().handle(command, scope)
