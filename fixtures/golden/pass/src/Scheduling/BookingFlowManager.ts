import { makeProcessManager, transitionProcessManager } from "@rta/core"

type BookingFlowState = {
  readonly slotId: string
  readonly invoiceCreated: boolean
}

type BookingFlowCommand =
  | { readonly _tag: "ReleaseSlot"; readonly slotId: string }
  | { readonly _tag: "Noop"; readonly slotId: string }

const initial = makeProcessManager<string, BookingFlowState, never, BookingFlowCommand>(
  "booking-flow-1",
  { slotId: "slot-1", invoiceCreated: false },
)

export const BookingFlowManager = transitionProcessManager(
  initial,
  { ...initial.state, invoiceCreated: true },
  [{ _tag: "Noop", slotId: initial.state.slotId }],
)
