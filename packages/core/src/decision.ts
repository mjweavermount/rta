import { Effect } from "effect"
import type { DecisionTypeId } from "./typeids.js"
import { DecisionTypeId as DTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// Decision
//
// Evaluates facts and returns a typed outcome. Always total — no failure path.
// Every input maps to exactly one outcome (_tag). The outcome drives branching
// in Reactions, ProcessManagers, and command handlers.
//
// Unlike a Rule (pass/fail), a Decision returns meaningful information about
// *which* path to take — "which pricing tier?" not "is this allowed?".
// ---------------------------------------------------------------------------

export interface Decision<I, O extends { readonly _tag: string }> {
  readonly [DTypeId]: DecisionTypeId
  readonly name: string
  evaluate(input: I): Effect.Effect<O, never>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const makeDecision = <I, O extends { readonly _tag: string }>(
  name: string,
  evaluate: (input: I) => Effect.Effect<O, never>,
): Decision<I, O> => ({
  [DTypeId]: DTypeId,
  name,
  evaluate,
})

// ---------------------------------------------------------------------------
// Outcome helper — build a tagged outcome value concisely
//
// ```ts
// const Standard = outcome("Standard")
// const Premium  = outcome("Premium")
// yield* Effect.succeed(Standard)
// ```
// ---------------------------------------------------------------------------

export const outcome = <T extends string>(tag: T): { readonly _tag: T } => ({ _tag: tag })

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export const isDecision = (u: unknown): u is Decision<unknown, { readonly _tag: string }> =>
  typeof u === "object" && u !== null && DTypeId in u
