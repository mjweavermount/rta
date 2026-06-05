import type { ValueObjectTypeId } from "./typeids.js"
import { ValueObjectTypeId as VOTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// ValueObject
//
// Equality by value. No identity. Immutable. Wraps a single typed value T.
// Carries ValueObjectTypeId — the brand that distinguishes it from Entity,
// AggregateRoot, etc. at the type level.
// ---------------------------------------------------------------------------

export interface ValueObject<T> {
  readonly [VOTypeId]: ValueObjectTypeId
  readonly value: T
}

/** Construct a ValueObject wrapping any value. */
export const makeValueObject = <T>(value: T): ValueObject<T> => ({
  [VOTypeId]: VOTypeId,
  value,
})

/** Runtime type guard. */
export const isValueObject = (u: unknown): u is ValueObject<unknown> =>
  typeof u === "object" && u !== null && VOTypeId in u

