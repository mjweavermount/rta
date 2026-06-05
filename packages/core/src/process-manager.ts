import type { AggregateRootTypeId, EntityTypeId, ProcessManagerTypeId } from "./typeids.js"
import {
  AggregateRootTypeId as ARTypeId,
  EntityTypeId as ETypeId,
  ProcessManagerTypeId as PMTypeId,
} from "./symbols.js"

// ---------------------------------------------------------------------------
// ProcessManager  (Tier-2 Policy)
//
// An aggregate-variant that tracks a multi-step flow across time. Has its own
// state, lives in a repository, reacts to incoming domain events, and emits
// commands. Reaches a terminal state when the flow completes.
//
// Carries ProcessManagerTypeId + AggregateRootTypeId + EntityTypeId:
//   - Repository<ProcessManager<...>> is valid (satisfies AggregateRoot constraint)
//   - isProcessManager narrows more precisely than isAggregateRoot
//
// Key distinction from AggregateRoot:
//   - AggregateRoot raises domain events (pendingEvents)
//   - ProcessManager emits commands (pendingCommands) — it IS the coordinator
//
// TId     — identity type
// TState  — state shape persisted across transitions
// TEvent  — domain events this PM reacts to (union type)
// TCommand — commands this PM emits
// ---------------------------------------------------------------------------

export interface ProcessManager<TId, TState, TEvent, TCommand> {
  readonly [PMTypeId]: ProcessManagerTypeId
  readonly [ARTypeId]: AggregateRootTypeId
  readonly [ETypeId]: EntityTypeId
  readonly id: TId
  readonly state: TState
  readonly pendingCommands: ReadonlyArray<TCommand>
  readonly isTerminal: boolean
}

// ---------------------------------------------------------------------------
// Type utilities
// ---------------------------------------------------------------------------

export type GetPMId<P extends ProcessManager<any, any, any, any>> =
  P extends ProcessManager<infer TId, any, any, any> ? TId : never

export type GetPMState<P extends ProcessManager<any, any, any, any>> =
  P extends ProcessManager<any, infer TState, any, any> ? TState : never

export type GetPMCommands<P extends ProcessManager<any, any, any, any>> =
  P extends ProcessManager<any, any, any, infer TCommand> ? TCommand : never

// ---------------------------------------------------------------------------
// Factory + helpers
// ---------------------------------------------------------------------------

/** Construct a ProcessManager in its initial state with no pending commands. */
export const makeProcessManager = <TId, TState, TEvent = never, TCommand = never>(
  id: TId,
  state: TState,
): ProcessManager<TId, TState, TEvent, TCommand> => ({
  [PMTypeId]: PMTypeId,
  [ARTypeId]: ARTypeId,
  [ETypeId]: ETypeId,
  id,
  state,
  pendingCommands: [],
  isTerminal: false,
})

/**
 * Return a new ProcessManager with updated state and additional commands queued.
 * The original is unchanged (immutable pattern mirrors raiseEvents).
 */
export const transitionProcessManager = <TId, TState, TEvent, TCommand>(
  pm: ProcessManager<TId, TState, TEvent, TCommand>,
  nextState: TState,
  commands: ReadonlyArray<TCommand>,
  options?: { readonly terminal?: boolean },
): ProcessManager<TId, TState, TEvent, TCommand> => ({
  ...pm,
  state: nextState,
  pendingCommands: [...pm.pendingCommands, ...commands],
  isTerminal: options?.terminal ?? pm.isTerminal,
})

/**
 * Return a new ProcessManager with pendingCommands cleared.
 * Called by the application layer after commands have been dispatched.
 */
export const clearPendingCommands = <TId, TState, TEvent, TCommand>(
  pm: ProcessManager<TId, TState, TEvent, TCommand>,
): ProcessManager<TId, TState, TEvent, TCommand> => ({
  ...pm,
  pendingCommands: [],
})

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export const isProcessManager = (u: unknown): u is ProcessManager<unknown, unknown, unknown, unknown> =>
  typeof u === "object" && u !== null && PMTypeId in u
