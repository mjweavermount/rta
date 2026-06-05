import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

// ---------------------------------------------------------------------------
// Read Model / Projection
//
// The query side's view of the world. Derived from domain events. Never
// written to directly by command handlers. Flat by design — no business logic.
// ---------------------------------------------------------------------------

export const ReadModelDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  fields: Schema.Array(FieldDeclaration),
})
export type ReadModelDeclaration = typeof ReadModelDeclaration.Type
