// @rta-generated vocab-hash:09ce41eef3b5ca0cbd33460c6cc009aa0eb4f0d53a3262f2ee5dfd249a9c1435
import { Effect } from "effect"
import { NotFound } from "@rta/core"
import { InstrumentedQueryHandler, type OperationSummary } from "@rta/strict"
import { OperationScope } from "@rta/core"
import type { GetSlotQuery } from "./queries.js"

// ---------------------------------------------------------------------------
// GetSlot handler
// ---------------------------------------------------------------------------

// TODO: replace unknown with the actual return type (e.g. SlotReadModelReadModel)
export class GetSlotHandler extends InstrumentedQueryHandler<GetSlotQuery, NotFound> {
  constructor() {
    super("GetSlotHandler", "Scheduling")
  }

  protected summarizeQuery(query: GetSlotQuery): OperationSummary {
    return {
      action: "Handle GetSlot",
      reason: "GetSlot was routed to the Scheduling read side",
      with: ["read model"],
      input: query._tag,
      output: "read model response",
      lineage: ["context:Scheduling", "query:GetSlot"],
    }
  }

  protected executeQuery(
    query: GetSlotQuery,
    _scope: OperationScope,
  ): Effect.Effect<unknown, NotFound> {
    return Effect.gen(function* () {
      void query
      // TODO: read from a read model / projection
      // Pattern:
      //   return yield* readModelStore.findBy(query.payload.getSlotId)
      return yield* Effect.die("not implemented")
    })
  }
}

export const handleGetSlot = (
  query: GetSlotQuery,
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
  new GetSlotHandler().handle(query, scope)
