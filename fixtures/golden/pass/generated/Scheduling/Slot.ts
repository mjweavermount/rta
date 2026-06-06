// @rta-generated vocab-hash:b5d0ab9e56cab68fdadab818f299f8188c39bb0b64976cb24621c3c2943c3c0d
import { Data } from "effect"
import { makeAggregateRoot, raiseEvents, type AggregateRoot } from "@rta/core"
import type { SlotOpenedPayload, SlotBookedPayload, SlotReleasedPayload } from "./events.js"

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type SlotId = string & { readonly _tag: "SlotId" }
export const makeSlotId = (raw: string): SlotId => raw as SlotId

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SlotData {
  // TODO: add state fields
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

// Events raised by this aggregate:
// SlotOpened, SlotBooked, SlotReleased
// TODO: tighten TEvent to the specific union once event types are imported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Slot = AggregateRoot<SlotId, SlotData, any>

// ---------------------------------------------------------------------------
// Domain Errors
// ---------------------------------------------------------------------------

// TODO: define domain errors using Data.TaggedError, e.g.:
// export class SomeInvalidState extends Data.TaggedError("SomeInvalidState")<{
//   readonly slotId: string
// }> {}
void Data.TaggedError // keep import used

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createSlot = (
  id: SlotId,
  data: SlotData,
): Slot => makeAggregateRoot<SlotId, SlotData>(id, data)

export { raiseEvents }
