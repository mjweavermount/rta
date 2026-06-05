import { Schema } from "effect"
import { FieldDeclaration, FieldTypeExpr } from "./primitives.js"

// ---------------------------------------------------------------------------
// Domain Service
//
// Stateless logic that doesn't naturally belong to a single aggregate.
// Lives in the domain layer. Has no infrastructure dependencies.
// ---------------------------------------------------------------------------

export const ServiceOperationDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  parameters: Schema.optional(Schema.Array(FieldDeclaration)),
  returns: FieldTypeExpr,
})
export type ServiceOperationDeclaration = typeof ServiceOperationDeclaration.Type

export const DomainServiceDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  operations: Schema.Array(ServiceOperationDeclaration),
})
export type DomainServiceDeclaration = typeof DomainServiceDeclaration.Type
