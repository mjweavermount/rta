import { Schema } from "effect"
import { IdDeclaration, FieldDeclaration } from "./primitives.js"

// ---------------------------------------------------------------------------
// Reaction  (Tier-1 Policy — pure, stateless)
//
// Maps a single incoming event to one or more outgoing commands.
// No state, no memory, fires synchronously when the trigger event arrives.
//
// Lives in the connections file because it crosses context boundaries.
//
// Example:
//   name: ReserveInventoryOnOrderPlaced
//   trigger: { event: OrderPlaced }
//   emits:
//     - { command: ReserveInventory, to: InventoryContext }
// ---------------------------------------------------------------------------

export const ReactionEmit = Schema.Struct({
  command: Schema.NonEmptyString,
  to: Schema.NonEmptyString,
})
export type ReactionEmit = typeof ReactionEmit.Type

export const ReactionPattern = Schema.Literal(
  "command-emitter",
  "notification",
  "integration-bridge",
  "projection-updater",
)
export type ReactionPattern = typeof ReactionPattern.Type

export const ReactionImplementationShape = Schema.Literal(
  "single-dispatch",
  "fan-out",
  "conditional-dispatch",
  "idempotent-upsert",
)
export type ReactionImplementationShape = typeof ReactionImplementationShape.Type

export const ReactionImplementationDeclaration = Schema.Struct({
  shape: ReactionImplementationShape,
})
export type ReactionImplementationDeclaration = typeof ReactionImplementationDeclaration.Type

export const ReactionDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  /** Optional T2 pattern annotation — e.g. "command-emitter". */
  pattern: Schema.optional(ReactionPattern),
  trigger: Schema.Struct({ event: Schema.NonEmptyString }),
  /** Optional implementation-shape hint used for generated obligations. */
  implementation: Schema.optional(ReactionImplementationDeclaration),
  emits: Schema.NonEmptyArray(ReactionEmit),
})
export type ReactionDeclaration = typeof ReactionDeclaration.Type

// ---------------------------------------------------------------------------
// ProcessManager  (Tier-2 Policy — stateful, aggregate variant)
//
// A named, aggregate-like entity that tracks a multi-step flow across time.
// Lives in a repository (explicitly persistent, not hidden saga magic).
// Reacts to incoming events, updates its own state, emits commands.
// Reaches a terminal state when the flow completes.
//
// Declared in the context file as a first-class domain primitive alongside
// aggregates.
//
// Example:
//   name: PaymentRetryManager
//   id: { name: PaymentRetryManagerId, backing: UUID }
//   trigger: { event: PaymentFailed, from: PaymentContext }
//   state:
//     - { name: orderId, type: OrderId }
//     - { name: attemptCount, type: NonNegativeInt }
//   transitions:
//     - on: PaymentFailed
//       emits: [RetryPayment]
//     - on: PaymentFailed
//       when: AttemptsExhausted   # references a Decision or Rule name
//       emits: [AbandonPayment]
//     - on: PaymentConfirmed
//       emits: [FulfillOrder]
//       terminal: true
// ---------------------------------------------------------------------------

export const ProcessManagerTransition = Schema.Struct({
  /** The domain event _tag that triggers this transition. */
  on: Schema.NonEmptyString,
  /** Commands to emit when this transition fires. */
  emits: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  /**
   * Optional guard: name of a Rule or Decision that must pass / evaluate
   * to a specific outcome before this transition fires.
   */
  when: Schema.optional(Schema.NonEmptyString),
  /** If true, the ProcessManager enters terminal state after this transition. */
  terminal: Schema.optional(Schema.Boolean),
})
export type ProcessManagerTransition = typeof ProcessManagerTransition.Type

export const ProcessManagerPattern = Schema.Literal(
  "saga",
  "retry-loop",
  "approval-flow",
  "compensation-flow",
  "lifecycle",
)
export type ProcessManagerPattern = typeof ProcessManagerPattern.Type

export const ProcessManagerImplementationShape = Schema.Literal(
  "linear-flow",
  "branching-flow",
  "retrying-flow",
  "timeout-aware",
)
export type ProcessManagerImplementationShape =
  typeof ProcessManagerImplementationShape.Type

export const ProcessManagerImplementationDeclaration = Schema.Struct({
  shape: ProcessManagerImplementationShape,
})
export type ProcessManagerImplementationDeclaration =
  typeof ProcessManagerImplementationDeclaration.Type

export const ProcessManagerDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  /** Optional T2 pattern annotation — e.g. "lifecycle". */
  pattern: Schema.optional(ProcessManagerPattern),
  /** Optional implementation-shape hint used for generated obligations. */
  implementation: Schema.optional(ProcessManagerImplementationDeclaration),
  id: IdDeclaration,
  /** The event that creates/activates this ProcessManager instance. */
  trigger: Schema.Struct({
    event: Schema.NonEmptyString,
    from: Schema.NonEmptyString,
  }),
  /** State fields persisted across event transitions. */
  state: Schema.Array(FieldDeclaration),
  transitions: Schema.NonEmptyArray(ProcessManagerTransition),
})
export type ProcessManagerDeclaration = typeof ProcessManagerDeclaration.Type
