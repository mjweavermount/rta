import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

// ---------------------------------------------------------------------------
// Command
//
// Strict CQRS: commands are fire-and-forget. They carry a payload and declare
// which domain events they cause. They do NOT declare a return type — results
// come back via the emitted events.
// ---------------------------------------------------------------------------

export const CommandDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  /** HTTP binding — "METHOD /path" e.g. "POST /api/secrets". Path params (:name) must match payload field names. Omit for internal commands not exposed via HTTP. */
  http: Schema.optional(Schema.NonEmptyString),
  payload: Schema.optional(Schema.Array(FieldDeclaration)),
  emits: Schema.optional(Schema.Array(Schema.NonEmptyString)),
})
export type CommandDeclaration = typeof CommandDeclaration.Type

// ---------------------------------------------------------------------------
// Domain Event
//
// Raised by aggregates only. Payload is immutable fact — past tense, happened.
// ---------------------------------------------------------------------------

export const DomainEventDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  payload: Schema.optional(Schema.Array(FieldDeclaration)),
})
export type DomainEventDeclaration = typeof DomainEventDeclaration.Type

// ---------------------------------------------------------------------------
// Query
//
// Read side only. Returns a projection/read-model. Never touches the write
// model. A QueryHandler cannot receive a Command — enforced in @rta/core.
// ---------------------------------------------------------------------------

export const QueryDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  /** HTTP binding — "METHOD /path" e.g. "GET /api/secrets/:secretId". Path params (:name) must match parameter field names. Omit for internal queries not exposed via HTTP. */
  http: Schema.optional(Schema.NonEmptyString),
  parameters: Schema.optional(Schema.Array(FieldDeclaration)),
  returns: Schema.NonEmptyString,
})
export type QueryDeclaration = typeof QueryDeclaration.Type
