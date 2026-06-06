import type { Command, DomainEvent, Query } from "@rta/core"
import type { MessageContext } from "./correlation.js"

// ---------------------------------------------------------------------------
// Strict message interfaces
//
// Each extends its @rta/core counterpart. Because they are structural
// supertypes (more fields), they satisfy the core type constraints:
//   StrictCommand<Tag, P>  extends  Command<Tag, P>
//   StrictDomainEvent<...> extends  DomainEvent<...>
//
// This means handlers typed against the strict interfaces reject plain core
// messages (missing fields), while handlers typed against core interfaces
// accept strict messages (they have all required fields and more).
// ---------------------------------------------------------------------------

/**
 * A command with mandatory correlation context.
 * Cannot be constructed without a MessageContext — there is no factory
 * overload that omits it.
 */
export interface StrictCommand<Tag extends string, TPayload>
  extends Command<Tag, TPayload>,
    MessageContext {
  readonly messageId: string
}

/**
 * A domain event with mandatory correlation context and aggregate provenance.
 * The causationId here is the ID of the command (or prior event) that
 * caused the aggregate to raise this event.
 */
export interface StrictDomainEvent<Tag extends string, TPayload>
  extends DomainEvent<Tag, TPayload> {
  readonly messageId: string
  readonly correlationId: MessageContext["correlationId"]
  readonly causationId: MessageContext["causationId"]
  readonly aggregateId: string
  readonly aggregateType: string
}

/**
 * A query with mandatory correlation context.
 * Allows tracing read-path operations back to their originating request and
 * immediate cause. Queries do not mutate state, but they still participate in
 * the same execution envelope as commands and events.
 */
export interface StrictQuery<Tag extends string, TPayload, TResult>
  extends Query<Tag, TPayload, TResult>,
    MessageContext {
  readonly messageId: string
}
