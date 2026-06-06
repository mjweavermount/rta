// @rta-generated vocab-hash:09ce41eef3b5ca0cbd33460c6cc009aa0eb4f0d53a3262f2ee5dfd249a9c1435
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
