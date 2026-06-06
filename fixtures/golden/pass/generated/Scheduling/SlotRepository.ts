// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
import { Context, Effect, Layer } from "effect"
import { NotFound } from "@rta/core"
import type { Slot, SlotId } from "./Slot.js"

// ---------------------------------------------------------------------------
// SlotRepository
// ---------------------------------------------------------------------------

export class SlotRepository extends Context.Tag("Scheduling.SlotRepository")<
  SlotRepository,
  {
    readonly findById: (id: SlotId) => Effect.Effect<Slot, NotFound>
    readonly save: (aggregate: Slot) => Effect.Effect<void>
    readonly nextId: () => Effect.Effect<SlotId>
  }
>() {}

// ---------------------------------------------------------------------------
// In-memory implementation (for tests and local dev)
// ---------------------------------------------------------------------------

// Exported so the API server can read live state without Effect
export const _slotStore = new Map<string, Slot>()

export const SlotRepositoryInMemory = Layer.sync(SlotRepository, () => {
  let counter = 0
  return {
    findById: (id) =>
      _slotStore.has(String(id))
        ? Effect.succeed(_slotStore.get(String(id)) as Slot)
        : Effect.fail(new NotFound({ entityType: "Slot", id })),
    save: (agg) => Effect.sync(() => { _slotStore.set(String(agg.id), agg) }),
    nextId: () => Effect.sync(() => `slot-${++counter}` as SlotId),
  }
})
