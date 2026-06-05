import { Effect } from "effect"
import type { RuleTypeId } from "./typeids.js"
import { RuleTypeId as RTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// RuleViolation
//
// Emitted when a Rule fails. V is the violation _tag (a string literal union
// declared in the context YAML under `violation:`).
// ---------------------------------------------------------------------------

export interface RuleViolation<V extends string = string> {
  readonly _tag: V
  readonly rule: string
  readonly message?: string
}

// ---------------------------------------------------------------------------
// Rule
//
// A named predicate. Pure, synchronous, no side effects. Returns void on
// success; fails with a RuleViolation on failure.
//
// Rules are the only permitted form of conditional branching inside command
// handlers — all business conditions must be named here, not inlined.
// ---------------------------------------------------------------------------

export interface Rule<I, V extends string> {
  readonly [RTypeId]: RuleTypeId
  readonly name: string
  check(input: I): Effect.Effect<void, RuleViolation<V>>
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export const makeRule = <I, V extends string>(
  name: string,
  check: (input: I) => Effect.Effect<void, RuleViolation<V>>,
): Rule<I, V> => ({
  [RTypeId]: RTypeId,
  name,
  check,
})

/**
 * Helper to construct a typed RuleViolation.
 *
 * ```ts
 * yield* Effect.fail(ruleViolation("OrderHasNoItems", "OrderMustHaveItems"))
 * ```
 */
export const ruleViolation = <V extends string>(
  tag: V,
  rule: string,
  message?: string,
): RuleViolation<V> => {
  const v: { _tag: V; rule: string; message?: string } = { _tag: tag, rule }
  if (message !== undefined) v.message = message
  return v
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export const isRule = (u: unknown): u is Rule<unknown, string> =>
  typeof u === "object" && u !== null && RTypeId in u
