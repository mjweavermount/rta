import { Effect } from "effect"
import type { ReactionTypeId } from "./typeids.js"
import { ReactionTypeId as RxTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// Reaction  (Tier-1 Policy)
//
// Pure event → commands mapping. Stateless, fires immediately, no queries.
// The simplest form of cross-context policy: "because X happened, do Y".
//
// E — the trigger event type (must have _tag)
// C — the command type to emit
// ---------------------------------------------------------------------------

export interface Reaction<E extends { readonly _tag: string }, C> {
  readonly [RxTypeId]: ReactionTypeId
  readonly name: string
  /** The event _tag this reaction listens for. */
  readonly trigger: E["_tag"]
  handle(event: E): Effect.Effect<ReadonlyArray<C>, never>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const makeReaction = <E extends { readonly _tag: string }, C>(
  name: string,
  trigger: E["_tag"],
  handle: (event: E) => Effect.Effect<ReadonlyArray<C>, never>,
): Reaction<E, C> => ({
  [RxTypeId]: RxTypeId,
  name,
  trigger,
  handle,
})

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export const isReaction = (u: unknown): u is Reaction<{ readonly _tag: string }, unknown> =>
  typeof u === "object" && u !== null && RxTypeId in u
