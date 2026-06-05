import { Schema } from "effect"

// ---------------------------------------------------------------------------
// CorrelationId
//
// Traces a full request chain end-to-end. Generated once at the entry point
// (e.g. HTTP handler, CLI command, scheduled job) and propagated unchanged
// through every Command, DomainEvent, and Query in that chain.
// ---------------------------------------------------------------------------

export const CorrelationIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("CorrelationId"),
)
export type CorrelationId = Schema.Schema.Type<typeof CorrelationIdSchema>

/** Generate a fresh CorrelationId. Call this at system entry points only. */
export const generateCorrelationId = (): CorrelationId =>
  Schema.decodeSync(CorrelationIdSchema)(crypto.randomUUID())

// ---------------------------------------------------------------------------
// CausationId
//
// Identifies the immediate cause of a message — "what directly triggered
// this?". A Command's CausationId is usually the CorrelationId of the HTTP
// request that initiated the chain. A DomainEvent's CausationId is the
// CommandId (or previous EventId) that caused the aggregate to raise it.
// ---------------------------------------------------------------------------

export const CausationIdSchema = Schema.NonEmptyString.pipe(
  Schema.brand("CausationId"),
)
export type CausationId = Schema.Schema.Type<typeof CausationIdSchema>

/** Promote a CorrelationId to a CausationId (common at chain entry point). */
export const correlationToCausation = (id: CorrelationId): CausationId =>
  id as unknown as CausationId

// ---------------------------------------------------------------------------
// MessageContext
//
// Mandatory on every strict message. No correlation context → no message.
// The Schema backs every field — runtime validation at all boundaries.
// ---------------------------------------------------------------------------

export const MessageContextSchema = Schema.Struct({
  correlationId: CorrelationIdSchema,
  causationId: CausationIdSchema,
  issuedAt: Schema.DateFromSelf,
  issuedBy: Schema.NonEmptyString,
})
export type MessageContext = Schema.Schema.Type<typeof MessageContextSchema>

/** Convenience: build a MessageContext at a chain entry point. */
export const makeRootContext = (issuedBy: string): MessageContext => {
  const correlationId = generateCorrelationId()
  return {
    correlationId,
    causationId: correlationToCausation(correlationId),
    issuedAt: new Date(),
    issuedBy,
  }
}

/**
 * Build a child MessageContext that continues a correlation chain.
 * The causationId changes (identifying the triggering message);
 * the correlationId is inherited unchanged.
 */
export const makeChildContext = (
  parent: MessageContext,
  causationId: CausationId,
  issuedBy?: string,
): MessageContext => ({
  correlationId: parent.correlationId,
  causationId,
  issuedAt: new Date(),
  issuedBy: issuedBy ?? parent.issuedBy,
})
