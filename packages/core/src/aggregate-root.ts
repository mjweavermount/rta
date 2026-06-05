import type { AggregateRootTypeId, EntityTypeId } from "./typeids.js"
import { AggregateRootTypeId as ARTypeId, EntityTypeId as ETypeId } from "./symbols.js"
import type { DomainEvent } from "./domain-event.js"

// ---------------------------------------------------------------------------
// AggregateRoot
//
// The consistency boundary. Commands target it; it raises domain events.
// Owns its child entities and value objects.
//
// Carries BOTH AggregateRootTypeId AND EntityTypeId — an AggregateRoot IS
// also an Entity. This lets type constraints be as precise as needed:
//   - "must be an Entity"        → constraint on EntityTypeId
//   - "must be an AggregateRoot" → constraint on AggregateRootTypeId
//
// TId    — identity type
// TData  — state shape
// TEvent — the domain events this aggregate can raise (union type)
//
// pendingEvents accumulates raised events during command processing.
// The application layer publishes them and calls clearPendingEvents.
// ---------------------------------------------------------------------------

export interface AggregateRoot<
  TId,
  TData,
  TEvent extends DomainEvent<string, unknown> = DomainEvent<string, unknown>,
> {
  readonly [ARTypeId]: AggregateRootTypeId
  readonly [ETypeId]: EntityTypeId
  readonly id: TId
  readonly data: TData
  readonly pendingEvents: ReadonlyArray<TEvent>
}

// ---------------------------------------------------------------------------
// Type utilities
// ---------------------------------------------------------------------------

export type GetId<A extends AggregateRoot<any, any, any>> =
  A extends AggregateRoot<infer TId, any, any> ? TId : never

export type GetData<A extends AggregateRoot<any, any, any>> =
  A extends AggregateRoot<any, infer TData, any> ? TData : never

export type GetEvents<A extends AggregateRoot<any, any, any>> =
  A extends AggregateRoot<any, any, infer TEvent> ? TEvent : never

// ---------------------------------------------------------------------------
// Factory + helpers
// ---------------------------------------------------------------------------

/** Construct an AggregateRoot with no pending events. */
export const makeAggregateRoot = <
  TId,
  TData,
  TEvent extends DomainEvent<string, unknown> = never,
>(
  id: TId,
  data: TData,
): AggregateRoot<TId, TData, TEvent> => ({
  [ARTypeId]: ARTypeId,
  [ETypeId]: ETypeId,
  id,
  data,
  pendingEvents: [],
})

/**
 * Return a new aggregate with additional events appended to pendingEvents.
 * The original aggregate is unchanged (immutable pattern).
 */
export const raiseEvents = <A extends AggregateRoot<any, any, any>>(
  aggregate: A,
  ...events: ReadonlyArray<GetEvents<A>>
): A => ({
  ...aggregate,
  pendingEvents: [...aggregate.pendingEvents, ...events],
})

/**
 * Return a new aggregate with pendingEvents cleared.
 * Called by the application layer after events have been published.
 */
export const clearPendingEvents = <A extends AggregateRoot<any, any, any>>(aggregate: A): A => ({
  ...aggregate,
  pendingEvents: [],
})

/** Runtime type guard. */
export const isAggregateRoot = (u: unknown): u is AggregateRoot<unknown, unknown> =>
  typeof u === "object" && u !== null && ARTypeId in u

