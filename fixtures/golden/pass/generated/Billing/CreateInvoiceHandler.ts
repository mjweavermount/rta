// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
import { Effect } from "effect"
import { NotFound, RepositoryError } from "@rta/core"
import { InstrumentedCommandHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { CreateInvoiceCommand } from "./commands.js"
import { InvoiceRepository } from "./InvoiceRepository.js"

// ---------------------------------------------------------------------------
// CreateInvoice handler
// ---------------------------------------------------------------------------

export class CreateInvoiceHandler extends InstrumentedCommandHandler<CreateInvoiceCommand, NotFound | RepositoryError, InvoiceRepository> {
  constructor() {
    super("CreateInvoiceHandler", "Billing")
  }

  protected summarizeCommand(command: CreateInvoiceCommand): OperationSummary {
    return {
      action: "Handle CreateInvoice",
      reason: "CreateInvoice was routed to the Billing bounded context",
      with: ["InvoiceRepository"],
      input: command._tag,
      output: "domain events staged by command handler",
      lineage: ["context:Billing", "aggregate:Invoice", "command:CreateInvoice"],
    }
  }

  protected executeCommand(
    command: CreateInvoiceCommand,
    _scope: OperationScope,
  ): Effect.Effect<void, NotFound | RepositoryError, InvoiceRepository> {
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

export const handleCreateInvoice = (
  command: CreateInvoiceCommand,
  scope = new OperationScope({
    traceId: command._tag,
    operationId: command._tag,
    spanId: command._tag,
    trustLevel: "command",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => command._tag },
  }),
): Effect.Effect<void, NotFound | RepositoryError, InvoiceRepository> =>
  new CreateInvoiceHandler().handle(command, scope)
