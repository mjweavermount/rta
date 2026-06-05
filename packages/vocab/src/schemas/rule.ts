import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

export const RuleImplementationShape = Schema.Literal(
  "predicate",
  "state-precondition",
  "exclusivity",
  "cross-field-consistency",
)
export type RuleImplementationShape = typeof RuleImplementationShape.Type

export const RuleImplementationDeclaration = Schema.Struct({
  shape: RuleImplementationShape,
})
export type RuleImplementationDeclaration = typeof RuleImplementationDeclaration.Type

// ---------------------------------------------------------------------------
// Rule
//
// A named invariant attached to an aggregate. Pure, synchronous predicate:
// either passes (void) or fails with a named violation.
//
// Rules are declared on aggregates in the context YAML. The @rta/core
// primitive enforces them; @rta/strict instruments them for capture.
// ---------------------------------------------------------------------------

export const RuleDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  /** The violation _tag emitted when the rule fails. */
  violation: Schema.NonEmptyString,
  /**
   * External inputs the rule needs beyond the aggregate's own state.
   * Empty / omitted means the rule only inspects the aggregate itself.
   */
  input: Schema.optional(Schema.Array(FieldDeclaration)),
  /** Optional T2 pattern annotation — e.g. "guard" or "availability". */
  pattern: Schema.optional(Schema.NonEmptyString),
  /** Optional implementation-shape hint used for generated obligations. */
  implementation: Schema.optional(RuleImplementationDeclaration),
})
export type RuleDeclaration = typeof RuleDeclaration.Type
