import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

export const DecisionImplementationShape = Schema.Literal(
  "numeric-buckets",
  "lookup-table",
  "predicate-chain",
  "scorecard",
  "matrix",
)
export type DecisionImplementationShape = typeof DecisionImplementationShape.Type

export const DecisionImplementationDeclaration = Schema.Struct({
  shape: DecisionImplementationShape,
})
export type DecisionImplementationDeclaration = typeof DecisionImplementationDeclaration.Type

// ---------------------------------------------------------------------------
// Decision
//
// Evaluates facts and returns a typed outcome from a fixed set. Always total
// — every input maps to exactly one outcome, no failure path.
//
// Decisions live at the context level (not on an individual aggregate) because
// they often cross aggregate boundaries or synthesise multiple facts.
//
// Example:
//   name: AppointmentCancellationEligibility
//   input: [{ name: appointment, type: Appointment }, { name: now, type: Timestamp }]
//   outcomes: [Eligible, TooLateToCancel, AlreadyCancelled]
// ---------------------------------------------------------------------------

export const DecisionDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  input: Schema.optional(Schema.Array(FieldDeclaration)),
  /** Discriminated union member names — the possible outcomes. */
  outcomes: Schema.NonEmptyArray(Schema.NonEmptyString),
  /** Optional T2 pattern annotation — e.g. "lifecycle" or "classifier". */
  pattern: Schema.optional(Schema.NonEmptyString),
  /** Optional implementation-shape hint used for generated obligations. */
  implementation: Schema.optional(DecisionImplementationDeclaration),
})
export type DecisionDeclaration = typeof DecisionDeclaration.Type
