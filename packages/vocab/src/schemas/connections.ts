import { Schema } from "effect"
import { ReactionDeclaration } from "./policy.js"

// ---------------------------------------------------------------------------
// Connection maps  (strict-layer concern, declared at vocab level)
//
// Separate from the context file by design:
//   context file  = what EXISTS in a context
//   connections file = what is PERMITTED to flow between contexts
//
// The visualizer's "wiring view" is built directly from these files.
// The @rta/strict layer enforces them at runtime.
// ---------------------------------------------------------------------------

export const PublishesRule = Schema.Struct({
  event: Schema.NonEmptyString,
  to: Schema.NonEmptyArray(Schema.NonEmptyString),
})
export type PublishesRule = typeof PublishesRule.Type

export const SubscribesRule = Schema.Struct({
  event: Schema.NonEmptyString,
  from: Schema.NonEmptyString,
})
export type SubscribesRule = typeof SubscribesRule.Type

export const ConnectionsDeclaration = Schema.Struct({
  kind: Schema.Literal("Connections"),
  context: Schema.NonEmptyString,
  publishes: Schema.optional(Schema.Array(PublishesRule)),
  subscribes: Schema.optional(Schema.Array(SubscribesRule)),
  /** Pure event→command reactions owned by this context's connections. */
  reactions: Schema.optional(Schema.Array(ReactionDeclaration)),
})
export type ConnectionsDeclaration = typeof ConnectionsDeclaration.Type
