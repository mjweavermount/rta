import { Effect } from "effect"
import type { EdgeBoundaryTypeId } from "./typeids.js"
import { EdgeBoundaryTypeId as EBTypeId } from "./symbols.js"
import type { EdgeBoundaryError, DomainError } from "./errors.js"
import type { OperationScope, Reason } from "./operation-scope.js"

export interface EdgeBoundary<I, O> {
  readonly [EBTypeId]: EdgeBoundaryTypeId
  readonly name: string
  readonly system: string
  readonly parse: (input: I, reason: Reason, scope?: OperationScope) =>
    Effect.Effect<O, EdgeBoundaryError | DomainError>
}

export const markEdgeBoundary = <T extends object>(boundary: T): T & {
  readonly [EBTypeId]: EdgeBoundaryTypeId
} => ({
  ...boundary,
  [EBTypeId]: EBTypeId,
})

export const isEdgeBoundary = (value: unknown): value is EdgeBoundary<unknown, unknown> =>
  typeof value === "object" && value !== null && EBTypeId in value
