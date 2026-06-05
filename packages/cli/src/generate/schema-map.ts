// ---------------------------------------------------------------------------
// Map vocab FieldTypeExpr strings to Effect Schema expressions
// ---------------------------------------------------------------------------

// A FieldTypeExpr is a NonEmptyString from the vocab schema.
// Convention (kept intentionally simple for v1):
//   "string"   → Schema.String
//   "number"   → Schema.Number
//   "boolean"  → Schema.Boolean
//   "Date"     → Schema.DateFromSelf
//   "string?"  → Schema.optional(Schema.String)   (trailing ? = optional)
//   "Foo"      → Schema.String  (unknown custom type → string fallback)

const PRIMITIVE_MAP: Record<string, string> = {
  string: "Schema.String",
  number: "Schema.Number",
  boolean: "Schema.Boolean",
  Date: "Schema.DateFromSelf",
  uuid: "Schema.UUID",
  "non-empty-string": "Schema.NonEmptyString",
}

export const mapFieldType = (typeExpr: string): string => {
  const optional = typeExpr.endsWith("?")
  const base = optional ? typeExpr.slice(0, -1) : typeExpr

  const schemaExpr = PRIMITIVE_MAP[base] ?? "Schema.String"
  return optional ? `Schema.optional(${schemaExpr})` : schemaExpr
}
