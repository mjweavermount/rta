import { Data } from "effect"

// ---------------------------------------------------------------------------
// Domain error hierarchy
//
// All extend Data.TaggedError so they are:
//   - discriminable by _tag
//   - structurally equal by value (Data semantics)
//   - Effect-native (no instanceof required)
// ---------------------------------------------------------------------------

/** A domain rule violation — business logic said no. */
export class DomainError extends Data.TaggedError("DomainError")<{
  readonly message: string
  readonly context?: Readonly<Record<string, unknown>>
}> {}

/** A named entity/aggregate could not be found. */
export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entityType: string
  readonly id: unknown
}> {}

/** The persistence layer failed. */
export class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly message: string
  readonly cause: unknown
}> {}

/** One or more invariants on a domain object were violated. */
export class DomainValidationError extends Data.TaggedError("DomainValidationError")<{
  readonly message: string
  readonly violations: ReadonlyArray<string>
}> {}
