import { Schema, Data, Effect } from "effect"
import { parse } from "yaml"

// ---------------------------------------------------------------------------
// ARD YAML schema
// ---------------------------------------------------------------------------

export const SeveritySchema = Schema.Literal("error", "warn")
export type Severity = Schema.Schema.Type<typeof SeveritySchema>

export const ArdKindSchema = Schema.Literal("spirit", "letter")
export type ArdKind = Schema.Schema.Type<typeof ArdKindSchema>

export const ArdFamilySchema = Schema.NonEmptyString
export type ArdFamily = Schema.Schema.Type<typeof ArdFamilySchema>

export const ArdStatusSchema = Schema.Literal("proposed", "accepted", "superseded", "rejected")
export type ArdStatus = Schema.Schema.Type<typeof ArdStatusSchema>

const NonEmptyStringListSchema = Schema.NonEmptyArray(Schema.NonEmptyString)

export const CheckDeclarationSchema = Schema.Struct({
  description: Schema.NonEmptyString,
  command: Schema.NonEmptyString,
})
export type CheckDeclaration = Schema.Schema.Type<typeof CheckDeclarationSchema>

export const EnforcementDeclarationSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("command"),
    description: Schema.NonEmptyString,
    command: Schema.NonEmptyString,
    expected: Schema.optional(Schema.Literal("pass", "fail")),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixture"),
    description: Schema.NonEmptyString,
    path: Schema.NonEmptyString,
    expected: Schema.Literal("pass", "fail"),
  }),
  Schema.Struct({
    kind: Schema.Literal("test"),
    description: Schema.NonEmptyString,
    path: Schema.NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal("waiver"),
    description: Schema.NonEmptyString,
    reason: Schema.NonEmptyString,
    expiresAt: Schema.optional(Schema.NonEmptyString),
  }),
)
export type EnforcementDeclaration = Schema.Schema.Type<typeof EnforcementDeclarationSchema>

export const ArdDeclarationSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  kind: ArdKindSchema,
  family: ArdFamilySchema,
  name: Schema.NonEmptyString,
  status: Schema.optional(ArdStatusSchema),
  description: Schema.optional(Schema.String),
  spirit: NonEmptyStringListSchema,
  letters: Schema.optional(NonEmptyStringListSchema),
  severity: SeveritySchema,
  checks: Schema.Array(CheckDeclarationSchema),
  enforcement: Schema.optional(Schema.Array(EnforcementDeclarationSchema)),
  decision: Schema.optional(Schema.String),
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
  const rawChecks = Array.isArray(record.checks) ? record.checks : []
  const rawEnforcement = Array.isArray(record.enforcement) ? record.enforcement : []
  const normalizedChecks = rawChecks.map((check) =>
    check != null && typeof check === "object" && !Array.isArray(check)
      ? check
      : { description: "legacy ARD check", command: String(check) },
  )
  const checkEnforcement = normalizedChecks
    .filter((check): check is { readonly description: unknown; readonly command: unknown } =>
      check != null &&
      typeof check === "object" &&
      "description" in check &&
      "command" in check,
    )
    .map((check) => ({
      kind: "command",
      description: check.description,
      command: check.command,
      expected: "pass",
    }))

  return {
    ...record,
    name: record.name ?? record.title,
    status: record.status ?? "accepted",
    severity: record.severity ?? "error",
    checks: normalizedChecks,
    enforcement: [...rawEnforcement, ...checkEnforcement],
    spirit: normalizeStringList(record.spirit ?? (
      record.kind === "spirit"
        ? ["docs/rta-production-authoring-platform-spec.md#philosophical-heart"]
        : undefined
    )),
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
