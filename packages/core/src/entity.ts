import type { EntityTypeId } from "./typeids.js"
import { EntityTypeId as ETypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// Entity
//
// Equality by identity (id), not by value. Mutable over time.
// Owned by an AggregateRoot — never persisted independently.
//
// TId  — the identity type (branded string, number, etc.)
// TData — the entity's state shape
// ---------------------------------------------------------------------------

export interface Entity<TId, TData> {
  readonly [ETypeId]: EntityTypeId
  readonly id: TId
  readonly data: TData
}

/** Construct an Entity. */
export const makeEntity = <TId, TData>(id: TId, data: TData): Entity<TId, TData> => ({
  [ETypeId]: ETypeId,
  id,
  data,
})

/** Runtime type guard. */
export const isEntity = (u: unknown): u is Entity<unknown, unknown> =>
  typeof u === "object" && u !== null && ETypeId in u

