import { Effect, ParseResult, Schema } from "effect"
import type { DomainEventTypeId } from "./typeids.js"
import { DomainEventTypeId as DETypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// DomainEvent
//
// Immutable fact — something that happened in the domain. Past tense.
// Raised by aggregates only (enforced by convention in @rta/core;
// enforced structurally in @rta/strict).
//
// Tag     — string literal discriminant (e.g. "OrderPlaced")
// TPayload — the event's data shape (already decoded)
// ---------------------------------------------------------------------------

export interface DomainEvent<Tag extends string, TPayload> {
  readonly [DETypeId]: DomainEventTypeId
  readonly _tag: Tag
  readonly payload: TPayload
  readonly occurredAt: Date
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface DomainEventConstructor<Tag extends string, S extends Schema.Schema<any, any, never>> {
  readonly _tag: Tag
  readonly schema: S
  /** Decode + validate raw input, producing an event with occurredAt = now. */
  readonly make: (
    raw: unknown,
  ) => Effect.Effect<DomainEvent<Tag, Schema.Schema.Type<S>>, ParseResult.ParseError>
  /** Narrow an unknown value to this specific event type. */
  readonly is: (u: unknown) => u is DomainEvent<Tag, Schema.Schema.Type<S>>
}

export const defineDomainEvent = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
): DomainEventConstructor<Tag, S> => ({
  _tag,
  schema,
  make: (raw) =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [DETypeId]: DETypeId,
        _tag,
        payload,
        occurredAt: new Date(),
      })),
    ),
  is: (u): u is DomainEvent<Tag, Schema.Schema.Type<S>> =>
    typeof u === "object" && u !== null && DETypeId in u && (u as any)._tag === _tag,
})

/** Runtime type guard for any domain event. */
export const isDomainEvent = (u: unknown): u is DomainEvent<string, unknown> =>
  typeof u === "object" && u !== null && DETypeId in u

