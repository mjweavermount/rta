import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Tier vocabulary declarations
//
// These files describe the vocabulary ladder itself:
//   T2 PatternSpec       — reusable vocab pattern, with testing contract
//   ArchetypeSpec        — current compatibility name for reusable blueprints
//   ArchetypeInstance    — concrete binding of a blueprint to context events
//
// T3 is intentionally not encoded just because something is larger. A T3 item
// must read as "T3 is-a T2 is-a T1"; reusable compositions are blueprints unless
// they prove a true tier-specialization relationship.
//
// The CLI still owns cross-file resolution. This schema owns the typed source
// shape so catalog/wiki generation and linting do not grow a second parser.
// ---------------------------------------------------------------------------

export const TestingContractDeclaration = Schema.Struct({
  extends: Schema.NonEmptyString,
  adds: Schema.optional(Schema.Array(Schema.Unknown)),
})
export type TestingContractDeclaration =
  typeof TestingContractDeclaration.Type

export const PatternSpecDeclaration = Schema.Struct({
  kind: Schema.Literal("PatternSpec"),
  name: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  requiredPrimitives: Schema.NonEmptyArray(Schema.NonEmptyString),
  testingContract: TestingContractDeclaration,
  vocabHint: Schema.NonEmptyString,
  visualConcepts: Schema.NonEmptyArray(Schema.NonEmptyString),
  narrativeLabel: Schema.NonEmptyString,
})
export type PatternSpecDeclaration = typeof PatternSpecDeclaration.Type

export const ArchetypeRoleDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
})
export type ArchetypeRoleDeclaration = typeof ArchetypeRoleDeclaration.Type

export const ArchetypeSpecDeclaration = Schema.Struct({
  kind: Schema.Literal("ArchetypeSpec"),
  name: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  requiredPatterns: Schema.NonEmptyArray(Schema.NonEmptyString),
  inputRoles: Schema.Array(ArchetypeRoleDeclaration),
  outputRoles: Schema.Array(ArchetypeRoleDeclaration),
  testPlan: Schema.NonEmptyArray(Schema.Unknown),
  visualGuidance: Schema.NonEmptyString,
  narrativeLabel: Schema.NonEmptyString,
})
export type ArchetypeSpecDeclaration = typeof ArchetypeSpecDeclaration.Type

export const ArchetypeBindingDeclaration = Schema.Struct({
  role: Schema.NonEmptyString,
  event: Schema.NonEmptyString,
  from: Schema.NonEmptyString,
})
export type ArchetypeBindingDeclaration =
  typeof ArchetypeBindingDeclaration.Type

export const ArchetypeInstanceDeclaration = Schema.Struct({
  kind: Schema.Literal("ArchetypeInstance"),
  archetype: Schema.NonEmptyString,
  context: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  bindings: Schema.NonEmptyArray(ArchetypeBindingDeclaration),
})
export type ArchetypeInstanceDeclaration =
  typeof ArchetypeInstanceDeclaration.Type

export const TierVocabFile = Schema.Union(
  PatternSpecDeclaration,
  ArchetypeSpecDeclaration,
  ArchetypeInstanceDeclaration,
)
export type TierVocabFile = typeof TierVocabFile.Type
