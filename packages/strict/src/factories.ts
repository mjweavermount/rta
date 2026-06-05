import { Effect, ParseResult, Schema } from "effect"
import {
  CommandTypeId,
  DomainEventTypeId,
  QueryTypeId,
  isCommand,
} from "@rta/core"
import type { CausationId, MessageContext } from "./correlation.js"
import type { StrictCommand, StrictDomainEvent, StrictQuery } from "./message.js"

// ---------------------------------------------------------------------------
// defineStrictCommand
//
// Like @rta/core's defineCommand, but make() requires a MessageContext.
// The correlation/causation IDs are validated against their schemas.
// No context → no command. That's the contract.
// ---------------------------------------------------------------------------

export const defineStrictCommand = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
) => ({
  _tag,
  schema,
  make: (
    raw: unknown,
    context: MessageContext,
  ): Effect.Effect<StrictCommand<Tag, Schema.Schema.Type<S>>, ParseResult.ParseError> =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [CommandTypeId]: CommandTypeId,
        _tag,
        payload,
        messageId: crypto.randomUUID(),
        correlationId: context.correlationId,
        causationId: context.causationId,
        issuedAt: context.issuedAt,
        issuedBy: context.issuedBy,
      })),
    ),
  is: (u: unknown): u is StrictCommand<Tag, Schema.Schema.Type<S>> =>
    isCommand(u) &&
    typeof (u as any).correlationId === "string" &&
    typeof (u as any).causationId === "string" &&
    (u as any)._tag === _tag,
})

// ---------------------------------------------------------------------------
// defineStrictDomainEvent
//
// Like @rta/core's defineDomainEvent, but make() requires correlation
// context + aggregate provenance. occurredAt is set to now.
// ---------------------------------------------------------------------------

export interface StrictDomainEventMakeOptions {
  readonly context: MessageContext
  /** The cause of this event — usually the command ID / command correlationId. */
  readonly causationId?: CausationId
  readonly aggregateId: string
  readonly aggregateType: string
}

export const defineStrictDomainEvent = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
) => ({
  _tag,
  schema,
  make: (
    raw: unknown,
    opts: StrictDomainEventMakeOptions,
  ): Effect.Effect<StrictDomainEvent<Tag, Schema.Schema.Type<S>>, ParseResult.ParseError> =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [DomainEventTypeId]: DomainEventTypeId,
        _tag,
        payload,
        messageId: crypto.randomUUID(),
        occurredAt: new Date(),
        correlationId: opts.context.correlationId,
        causationId: opts.causationId ?? opts.context.causationId,
        aggregateId: opts.aggregateId,
        aggregateType: opts.aggregateType,
      })),
    ),
  is: (u: unknown): u is StrictDomainEvent<Tag, Schema.Schema.Type<S>> =>
    typeof u === "object" &&
    u !== null &&
    DomainEventTypeId in u &&
    typeof (u as any).correlationId === "string" &&
    (u as any)._tag === _tag,
})

// ---------------------------------------------------------------------------
// defineStrictQuery
//
// Like @rta/core's defineQuery, but make() requires a correlationId.
// The result schema is still stored for @rta/strict response validation.
// ---------------------------------------------------------------------------

export const defineStrictQuery = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
  R extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
  resultSchema: R,
) => ({
  _tag,
  schema,
  resultSchema,
  make: (
    raw: unknown,
    context: Pick<MessageContext, "correlationId" | "issuedBy">,
  ): Effect.Effect<StrictQuery<Tag, Schema.Schema.Type<S>, Schema.Schema.Type<R>>, ParseResult.ParseError> =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [QueryTypeId]: QueryTypeId,
        _tag,
        payload,
        correlationId: context.correlationId,
        issuedBy: context.issuedBy,
      })),
    ),
  is: (u: unknown): u is StrictQuery<Tag, Schema.Schema.Type<S>, Schema.Schema.Type<R>> =>
    typeof u === "object" &&
    u !== null &&
    QueryTypeId in u &&
    typeof (u as any).correlationId === "string" &&
    (u as any)._tag === _tag,
})
