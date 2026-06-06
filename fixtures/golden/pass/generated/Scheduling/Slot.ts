// @rta-generated vocab-hash:e4e6411a063cbaebccdf4b50d4cef582c5aab0c44ced24978db8c48fcfa27d3a
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
