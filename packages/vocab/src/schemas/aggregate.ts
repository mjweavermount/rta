import { Schema } from "effect"
import { Constraints, FieldDeclaration, IdDeclaration } from "./primitives.js"
import { CommandDeclaration, DomainEventDeclaration } from "./message.js"
import { RuleDeclaration } from "./rule.js"
import { DecisionDeclaration } from "./decision.js"

// ---------------------------------------------------------------------------
// Value Object
//
// Equality by value. No identity. Immutable.
// Either has named fields (structural) or wraps a single backing scalar
// (e.g. CancellationReason wraps String with constraints).
// ---------------------------------------------------------------------------

export const ValueObjectDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  // Single-value wrapper (e.g. backing: String + constraints)
  backing: Schema.optional(Schema.NonEmptyString),
  constraints: Schema.optional(Constraints),
  // Structural value object (e.g. Money { amount, currency })
  fields: Schema.optional(Schema.Array(FieldDeclaration)),
})
export type ValueObjectDeclaration = typeof ValueObjectDeclaration.Type

// ---------------------------------------------------------------------------
// Entity
//
// Equality by identity. Mutable over time. Owned by an aggregate.
// ---------------------------------------------------------------------------

export const EntityDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  id: IdDeclaration,
  fields: Schema.optional(Schema.Array(FieldDeclaration)),
})
export type EntityDeclaration = typeof EntityDeclaration.Type

// ---------------------------------------------------------------------------
// Aggregate Root
//
// Consistency boundary. Commands target it. It raises domain events.
// Owns its child entities and value objects.
// ---------------------------------------------------------------------------

export const AggregateDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  id: IdDeclaration,
  commands: Schema.optional(Schema.Array(CommandDeclaration)),
  events: Schema.optional(Schema.Array(DomainEventDeclaration)),
  entities: Schema.optional(Schema.Array(EntityDeclaration)),
  valueObjects: Schema.optional(Schema.Array(ValueObjectDeclaration)),
  /** Named invariants on this aggregate — checked before any state mutation. */
  rules: Schema.optional(Schema.Array(RuleDeclaration)),
  /** Decisions scoped to this aggregate's lifecycle or state routing. */
  decisions: Schema.optional(Schema.Array(DecisionDeclaration)),
})
export type AggregateDeclaration = typeof AggregateDeclaration.Type
