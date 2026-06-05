import { Schema, Data, Effect } from "effect"
import { parse } from "yaml"

// ---------------------------------------------------------------------------
// ARD YAML schema
// ---------------------------------------------------------------------------

export const SeveritySchema = Schema.Literal("error", "warn")
export type Severity = Schema.Schema.Type<typeof SeveritySchema>

export const ArdKindSchema = Schema.Literal("spirit", "letter")
export type ArdKind = Schema.Schema.Type<typeof ArdKindSchema>

export const ArdFamilySchema = Schema.Literal("ci", "t1", "t2", "t3", "fixture", "custom")
export type ArdFamily = Schema.Schema.Type<typeof ArdFamilySchema>

const NonEmptyStringListSchema = Schema.NonEmptyArray(Schema.NonEmptyString)

export const CheckDeclarationSchema = Schema.Struct({
  description: Schema.NonEmptyString,
  command: Schema.NonEmptyString,
})
export type CheckDeclaration = Schema.Schema.Type<typeof CheckDeclarationSchema>

export const ArdDeclarationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  kind: ArdKindSchema,
  family: ArdFamilySchema,
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
  spirit: NonEmptyStringListSchema,
  letters: Schema.optional(NonEmptyStringListSchema),
  severity: SeveritySchema,
  checks: Schema.Array(CheckDeclarationSchema),
})
export type ArdDeclaration = Schema.Schema.Type<typeof ArdDeclarationSchema>

// ---------------------------------------------------------------------------
// Parse error
// ---------------------------------------------------------------------------

export class ArdParseError extends Data.TaggedError("ArdParseError")<{
  readonly path: string
  readonly cause: unknown
}> {
  override get message() {
    return `Failed to parse ARD file: ${this.path}`
  }
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

const normalizeStringList = (value: unknown): unknown => {
  if (typeof value === "string") {
    return [value]
  }
  return value
}

const normalizeArdRaw = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw
  }

  const record = raw as Record<string, unknown>
  return {
    ...record,
    spirit: normalizeStringList(record.spirit),
    letters: normalizeStringList(record.letters),
  }
}

export const parseArdContent = (
  content: string,
  path = "<string>",
): Effect.Effect<ArdDeclaration, ArdParseError> =>
  Effect.try({
    try: () => {
      const raw = normalizeArdRaw(parse(content) as unknown)
      return Schema.decodeUnknownSync(ArdDeclarationSchema)(raw)
    },
    catch: (cause) => new ArdParseError({ path, cause }),
  })
