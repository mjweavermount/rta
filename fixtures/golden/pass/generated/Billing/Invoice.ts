// @rta-generated vocab-hash:e80ee1788c51f106995f34feaa0656ec5b2c1a0f63b702c0ac4d6fcd55586c84
import { Data } from "effect"
import { makeAggregateRoot, raiseEvents, type AggregateRoot } from "@rta/core"
import type { InvoiceCreatedPayload, InvoiceFailedPayload } from "./events.js"

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type InvoiceId = string & { readonly _tag: "InvoiceId" }
export const makeInvoiceId = (raw: string): InvoiceId => raw as InvoiceId

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface InvoiceData {
  // TODO: add state fields
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

// Events raised by this aggregate:
// InvoiceCreated, InvoiceFailed
// TODO: tighten TEvent to the specific union once event types are imported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Invoice = AggregateRoot<InvoiceId, InvoiceData, any>

// ---------------------------------------------------------------------------
// Domain Errors
// ---------------------------------------------------------------------------

// TODO: define domain errors using Data.TaggedError, e.g.:
// export class SomeInvalidState extends Data.TaggedError("SomeInvalidState")<{
//   readonly invoiceId: string
// }> {}
void Data.TaggedError // keep import used

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createInvoice = (
  id: InvoiceId,
  data: InvoiceData,
): Invoice => makeAggregateRoot<InvoiceId, InvoiceData>(id, data)

export { raiseEvents }
