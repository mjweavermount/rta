// @rta-generated vocab-hash:52033c12594a5716e045dcb64a3c3c10f8f4950148c0f3aeeab5dcbd827b9319
import { Context, Effect, Layer } from "effect"
import { NotFound } from "@rta/core"
import type { Invoice, InvoiceId } from "./Invoice.js"

// ---------------------------------------------------------------------------
// InvoiceRepository
// ---------------------------------------------------------------------------

export class InvoiceRepository extends Context.Tag("Billing.InvoiceRepository")<
  InvoiceRepository,
  {
    readonly findById: (id: InvoiceId) => Effect.Effect<Invoice, NotFound>
    readonly save: (aggregate: Invoice) => Effect.Effect<void>
    readonly nextId: () => Effect.Effect<InvoiceId>
  }
>() {}

// ---------------------------------------------------------------------------
// In-memory implementation (for tests and local dev)
// ---------------------------------------------------------------------------

// Exported so the API server can read live state without Effect
export const _invoiceStore = new Map<string, Invoice>()

export const InvoiceRepositoryInMemory = Layer.sync(InvoiceRepository, () => {
  let counter = 0
  return {
    findById: (id) =>
      _invoiceStore.has(String(id))
        ? Effect.succeed(_invoiceStore.get(String(id)) as Invoice)
        : Effect.fail(new NotFound({ entityType: "Invoice", id })),
    save: (agg) => Effect.sync(() => { _invoiceStore.set(String(agg.id), agg) }),
    nextId: () => Effect.sync(() => `invoice-${++counter}` as InvoiceId),
  }
})
