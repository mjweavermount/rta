// @rta-generated vocab-hash:56c2dbca0afaac7a92ec8cb18698354a0c54afa7bc5a3f91a90b53669f3e992f
import { Effect } from "effect"
import { NotFound } from "@rta/core"
import { InstrumentedQueryHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { GetInvoiceQuery } from "./queries.js"

// ---------------------------------------------------------------------------
// GetInvoice handler
// ---------------------------------------------------------------------------

// TODO: replace unknown with the actual return type (e.g. InvoiceReadModelReadModel)
export class GetInvoiceHandler extends InstrumentedQueryHandler<GetInvoiceQuery, NotFound> {
  constructor() {
    super("GetInvoiceHandler", "Billing")
  }

  protected summarizeQuery(query: GetInvoiceQuery): OperationSummary {
    return {
      action: "Handle GetInvoice",
      reason: "GetInvoice was routed to the Billing read side",
      with: ["read model"],
      input: query._tag,
      output: "read model response",
      lineage: ["context:Billing", "query:GetInvoice"],
    }
  }

  protected executeQuery(
    query: GetInvoiceQuery,
    _scope: OperationScope,
  ): Effect.Effect<unknown, NotFound> {
    return Effect.gen(function* () {
      void query
      // TODO: read from a read model / projection
      // Pattern:
      //   return yield* readModelStore.findBy(query.payload.getInvoiceId)
      return yield* Effect.die("not implemented")
    })
  }
}

export const handleGetInvoice = (
  query: GetInvoiceQuery,
  scope = new OperationScope({
    traceId: query._tag,
    operationId: query._tag,
    spanId: query._tag,
    trustLevel: "internal",
    identity: { actorId: "generated-registry" },
    clock: { now: () => new Date(0) },
    random: { uuid: () => query._tag },
  }),
): Effect.Effect<unknown, NotFound> =>
  new GetInvoiceHandler().handle(query, scope)
