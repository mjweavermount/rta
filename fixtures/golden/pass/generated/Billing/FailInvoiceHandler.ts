// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
import { Effect } from "effect"
import { NotFound } from "@rta/core"
import { InstrumentedCommandHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { FailInvoiceCommand } from "./commands.js"
import { InvoiceRepository } from "./InvoiceRepository.js"

// ---------------------------------------------------------------------------
// FailInvoice handler
// ---------------------------------------------------------------------------

export class FailInvoiceHandler extends InstrumentedCommandHandler<FailInvoiceCommand, NotFound, InvoiceRepository> {
  constructor() {
    super("FailInvoiceHandler", "Billing")
  }

  protected summarizeCommand(command: FailInvoiceCommand): OperationSummary {
    return {
      action: "Handle FailInvoice",
      reason: "FailInvoice was routed to the Billing bounded context",
      with: ["InvoiceRepository"],
      input: command._tag,
      output: "domain events staged by command handler",
      lineage: ["context:Billing", "aggregate:Invoice", "command:FailInvoice"],
    }
  }

  protected executeCommand(
    command: FailInvoiceCommand,
    _scope: OperationScope,
  ): Effect.Effect<void, NotFound, InvoiceRepository> {
    return Effect.gen(function* () {
      const repo = yield* InvoiceRepository
      void repo // TODO: load aggregate with repo.findById(...)
      void command
      // TODO: apply business logic, raise events, save
      // Pattern:
      //   const agg = yield* repo.findById(command.payload.invoiceId)
      //   if (agg.data.someState === "invalid") yield* Effect.fail(new SomeDomainError(...))
      //   const event = yield* SomethingHappened.make({...}, { context: command, aggregateId: agg.id, aggregateType: "Invoice" })
      //   const updated = raiseEvents(agg, event)
      //   yield* repo.save(updated)
    })
  }
}

export const handleFailInvoice = (
  command: FailInvoiceCommand,
  scope = new OperationScope({
    traceId: command._tag,
    operationId: command._tag,
    spanId: command._tag,
    trustLevel: "command",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => command._tag },
  }),
): Effect.Effect<void, NotFound, InvoiceRepository> =>
  new FailInvoiceHandler().handle(command, scope)
