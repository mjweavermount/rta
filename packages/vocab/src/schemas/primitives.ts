import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Identity backing types
// ---------------------------------------------------------------------------

export const IdBacking = Schema.Literal("UUID", "ULID", "String", "Int")
export type IdBacking = typeof IdBacking.Type

export const IdDeclaration = Schema.Struct({
  name: Schema.String,
  backing: IdBacking,
})
export type IdDeclaration = typeof IdDeclaration.Type

// ---------------------------------------------------------------------------
// Context classification
// ---------------------------------------------------------------------------

export const ContextClassification = Schema.Literal(
  "core-domain",
  "supporting",
  "generic",
  "external",
)
export type ContextClassification = typeof ContextClassification.Type

// ---------------------------------------------------------------------------
// Field type expression
//
// A string that names a type. May be:
//   - a built-in scalar:  "String", "Int", "Decimal", "Boolean",
//                         "UUID", "ULID", "Timestamp", "Date"
//   - a constrained type: "PositiveInt", "NonEmptyString", "Email", ...
//   - a reference to a type declared in this context: "Money"
//   - a collection:       "Money[]", "Optional<Money>"
//
// Semantic validation (resolving references) is the MCP server's job.
// The Schema only guarantees this is a non-empty string.
// ---------------------------------------------------------------------------

export const FieldTypeExpr = Schema.NonEmptyString
export type FieldTypeExpr = typeof FieldTypeExpr.Type

// ---------------------------------------------------------------------------
// Field declaration
// ---------------------------------------------------------------------------

export const FieldDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  type: FieldTypeExpr,
  optional: Schema.optional(Schema.Boolean),
})
export type FieldDeclaration = typeof FieldDeclaration.Type

// ---------------------------------------------------------------------------
// Value-object constraints
// ---------------------------------------------------------------------------

export const Constraints = Schema.Struct({
  minLength: Schema.optional(Schema.NonNegative),
  maxLength: Schema.optional(Schema.Positive),
  min: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  pattern: Schema.optional(Schema.NonEmptyString),
})
export type Constraints = typeof Constraints.Type
