import { Effect } from "effect"
import type {
  Decision,
  GetPMCommands,
  GetPMState,
  ProcessManager,
  Reaction,
  Rule,
  RuleViolation,
} from "@rta/core"
import { emitPrimitiveLifecycle, subscribePrimitiveLifecycle } from "./lifecycle.js"

// ---------------------------------------------------------------------------
// Rule capture bridge
//
// @rta/scenario registers a callback here at module load time.
// withRules automatically calls it for each rule evaluation, giving the
// capture system rule pass/fail data without any test-side wiring.
// ---------------------------------------------------------------------------

type RuleCaptureCallback = (
  name: string,
  aggregate: string,
  context: string,
  passed: boolean,
  violation?: string,
  message?: string,
  input?: Record<string, unknown>,
) => void

/** Called once by @rta/scenario at module load time to wire up auto-capture. */
export function registerRuleCaptureCallback(fn: RuleCaptureCallback): void {
  subscribePrimitiveLifecycle((event) => {
    if (event.primitiveType !== "rule") return
    if (event.phase === "received") return
    fn(
      event.primitiveName,
      event.aggregate,
      event.context,
      event.phase === "completed",
      event.violation,
      event.message,
      event.input,
    )
  })
}

// ---------------------------------------------------------------------------
// Decision capture bridge
// ---------------------------------------------------------------------------

type DecisionCaptureCallback = (
  name: string,
  context: string,
  outcome: string,
  input?: Record<string, unknown>,
) => void

/** Called once by @rta/scenario at module load time to wire up auto-capture. */
export function registerDecisionCaptureCallback(fn: DecisionCaptureCallback): void {
  subscribePrimitiveLifecycle((event) => {
    if (event.primitiveType !== "decision" || event.phase !== "completed" || event.outcome == null) {
      return
    }
    fn(event.primitiveName, event.context, event.outcome, event.input)
  })
}

// ---------------------------------------------------------------------------
// Reaction capture bridge
// ---------------------------------------------------------------------------

type ReactionCaptureCallback = (
  name: string,
  triggerEvent: string,
  from: string,
  to: string,
  emittedCommands: string[],
) => void

/** Called once by @rta/scenario at module load time to wire up auto-capture. */
export function registerReactionCaptureCallback(fn: ReactionCaptureCallback): void {
  subscribePrimitiveLifecycle((event) => {
    if (event.primitiveType !== "reaction" || event.phase !== "completed") return
    fn(event.primitiveName, event.triggerEvent, event.from, event.to, [...event.emittedCommands])
  })
}

// ---------------------------------------------------------------------------
// ProcessManager capture bridge
// ---------------------------------------------------------------------------

type ProcessManagerCaptureCallback = (
  name: string,
  context: string,
  triggerEvent: string,
  prevState: Record<string, unknown> | undefined,
  nextState: Record<string, unknown>,
  emittedCommands: string[],
) => void

/** Called once by @rta/scenario at module load time to wire up auto-capture. */
export function registerProcessManagerCaptureCallback(fn: ProcessManagerCaptureCallback): void {
  subscribePrimitiveLifecycle((event) => {
    if (
      event.primitiveType !== "process-manager" ||
      event.phase !== "completed" ||
      event.nextState === undefined ||
      event.emittedCommands === undefined
    ) {
      return
    }
    fn(
      event.primitiveName,
      event.context,
      event.triggerEvent,
      event.prevState,
      event.nextState,
      [...event.emittedCommands],
    )
  })
}

// withRules
//
// Wraps a handler function. Evaluates each rule against the input before
// delegating. If any rule fails the violation is re-raised immediately; the
// remaining rules and the handler are not called.
//
// Each evaluation (pass or fail) is reported to the capture bridge.
//
// Usage:
//   const handle = withRules(
//     [OrderMustHaveItems, CustomerNotSuspended],
//     "Order", "OrderManagement",
//     (cmd) => Effect.gen(function* () { ... }),
//   )
// ---------------------------------------------------------------------------

const toInputRecord = (input: unknown): Record<string, unknown> | undefined => {
  if (input != null && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return undefined
}

export function withRules<I, V extends string, R, E, Ctx>(
  rules: ReadonlyArray<Rule<I, V>>,
  aggregate: string,
  context: string,
  handler: (input: I) => Effect.Effect<R, E, Ctx>,
): (input: I) => Effect.Effect<R, E | RuleViolation<V>, Ctx> {
  return (input: I) =>
    Effect.gen(function* () {
      const inputRecord = toInputRecord(input)
      for (const rule of rules) {
        const receivedEvent: {
          primitiveType: "rule"
          primitiveName: string
          phase: "received"
          aggregate: string
          context: string
          input?: Record<string, unknown>
        } = {
          primitiveType: "rule",
          primitiveName: rule.name,
          phase: "received",
          aggregate,
          context,
        }
        if (inputRecord !== undefined) receivedEvent.input = inputRecord
        emitPrimitiveLifecycle(receivedEvent)
        const result = yield* Effect.either(rule.check(input))
        if (result._tag === "Left") {
          const v = result.left
          const failedEvent: {
            primitiveType: "rule"
            primitiveName: string
            phase: "failed"
            aggregate: string
            context: string
            input?: Record<string, unknown>
            violation?: string
            message?: string
          } = {
            primitiveType: "rule",
            primitiveName: rule.name,
            phase: "failed",
            aggregate,
            context,
          }
          if (inputRecord !== undefined) failedEvent.input = inputRecord
          failedEvent.violation = v._tag
          if (v.message !== undefined) failedEvent.message = v.message
          emitPrimitiveLifecycle(failedEvent)
          return yield* Effect.fail(v) as Effect.Effect<never, RuleViolation<V>, Ctx>
        }
        const completedEvent: {
          primitiveType: "rule"
          primitiveName: string
          phase: "completed"
          aggregate: string
          context: string
          input?: Record<string, unknown>
        } = {
          primitiveType: "rule",
          primitiveName: rule.name,
          phase: "completed",
          aggregate,
          context,
        }
        if (inputRecord !== undefined) completedEvent.input = inputRecord
        emitPrimitiveLifecycle(completedEvent)
      }
      return yield* handler(input)
    })
}

// ---------------------------------------------------------------------------
// instrumentDecision
//
// Wraps a Decision.evaluate call to auto-capture the outcome.
//
// Usage:
//   const result = yield* instrumentDecision(
//     PricingTierDecision, input, "OrderManagement"
//   )
// ---------------------------------------------------------------------------

export function instrumentDecision<I, O extends { readonly _tag: string }>(
  decision: Decision<I, O>,
  input: I,
  context: string,
): Effect.Effect<O, never> {
  const inputRecord = toInputRecord(input)
  const receivedEvent: {
    primitiveType: "decision"
    primitiveName: string
    phase: "received"
    context: string
    input?: Record<string, unknown>
  } = {
    primitiveType: "decision",
    primitiveName: decision.name,
    phase: "received",
    context,
  }
  if (inputRecord !== undefined) receivedEvent.input = inputRecord
  emitPrimitiveLifecycle(receivedEvent)
  return decision.evaluate(input).pipe(
    Effect.tap((o) =>
      Effect.sync(() => {
        const completedEvent: {
          primitiveType: "decision"
          primitiveName: string
          phase: "completed"
          context: string
          input?: Record<string, unknown>
          outcome?: string
        } = {
          primitiveType: "decision",
          primitiveName: decision.name,
          phase: "completed",
          context,
        }
        if (inputRecord !== undefined) completedEvent.input = inputRecord
        completedEvent.outcome = o._tag
        emitPrimitiveLifecycle(completedEvent)
      }),
    ),
  )
}

const commandNames = <C>(commands: ReadonlyArray<C>): string[] =>
  commands.map((command) =>
    command != null &&
    typeof command === "object" &&
    "_tag" in command &&
    typeof (command as { readonly _tag?: unknown })._tag === "string"
      ? (command as { readonly _tag: string })._tag
      : "unknown-command",
  )

const toStateRecord = (state: unknown): Record<string, unknown> | undefined => {
  if (state != null && typeof state === "object" && !Array.isArray(state)) {
    return state as Record<string, unknown>
  }
  return undefined
}

export function instrumentReaction<E extends { readonly _tag: string }, C>(
  reaction: Reaction<E, C>,
  event: E,
  options: {
    readonly context: string
    readonly from: string
    readonly to: string
  },
): Effect.Effect<ReadonlyArray<C>, never> {
  emitPrimitiveLifecycle({
    primitiveType: "reaction",
    primitiveName: reaction.name,
    phase: "received",
    context: options.context,
    triggerEvent: event._tag,
    from: options.from,
    to: options.to,
    emittedCommands: [],
  })
  return reaction.handle(event).pipe(
    Effect.tap((commands) =>
      Effect.sync(() => {
        const emittedCommands = commandNames(commands)
        emitPrimitiveLifecycle({
          primitiveType: "reaction",
          primitiveName: reaction.name,
          phase: "emitted",
          context: options.context,
          triggerEvent: event._tag,
          from: options.from,
          to: options.to,
          emittedCommands,
        })
        emitPrimitiveLifecycle({
          primitiveType: "reaction",
          primitiveName: reaction.name,
          phase: "completed",
          context: options.context,
          triggerEvent: event._tag,
          from: options.from,
          to: options.to,
          emittedCommands,
        })
      }),
    ),
  )
}

export function instrumentProcessManagerTransition<
  TId,
  TState,
  TEvent extends { readonly _tag: string },
  TCommand,
  E,
>(
  name: string,
  context: string,
  processManager: ProcessManager<TId, TState, TEvent, TCommand>,
  event: TEvent,
  transition: (
    processManager: ProcessManager<TId, TState, TEvent, TCommand>,
    event: TEvent,
  ) => Effect.Effect<ProcessManager<TId, TState, TEvent, TCommand>, E>,
): Effect.Effect<ProcessManager<TId, TState, TEvent, TCommand>, E> {
  const prevState = toStateRecord(processManager.state)
  const receivedEvent: {
    primitiveType: "process-manager"
    primitiveName: string
    phase: "received"
    context: string
    triggerEvent: string
    prevState?: Record<string, unknown>
  } = {
    primitiveType: "process-manager",
    primitiveName: name,
    phase: "received",
    context,
    triggerEvent: event._tag,
  }
  if (prevState !== undefined) receivedEvent.prevState = prevState
  emitPrimitiveLifecycle(receivedEvent)
  return Effect.gen(function* () {
    const result = yield* Effect.either(transition(processManager, event))
    if (result._tag === "Left") {
      const failedEvent: {
        primitiveType: "process-manager"
        primitiveName: string
        phase: "failed"
        context: string
        triggerEvent: string
        prevState?: Record<string, unknown>
        message?: string
      } = {
        primitiveType: "process-manager",
        primitiveName: name,
        phase: "failed",
        context,
        triggerEvent: event._tag,
      }
      if (prevState !== undefined) failedEvent.prevState = prevState
      failedEvent.message = String(result.left)
      emitPrimitiveLifecycle(failedEvent)
      return yield* Effect.fail(result.left)
    }
    const next = result.right
    const nextState = toStateRecord(next.state)
    const emittedCommands = commandNames(next.pendingCommands)
    const stateChangedEvent: {
      primitiveType: "process-manager"
      primitiveName: string
      phase: "state-changed"
      context: string
      triggerEvent: string
      prevState?: Record<string, unknown>
      nextState?: Record<string, unknown>
      terminal?: boolean
    } = {
      primitiveType: "process-manager",
      primitiveName: name,
      phase: "state-changed",
      context,
      triggerEvent: event._tag,
      terminal: next.isTerminal,
    }
    if (prevState !== undefined) stateChangedEvent.prevState = prevState
    if (nextState !== undefined) stateChangedEvent.nextState = nextState
    emitPrimitiveLifecycle(stateChangedEvent)
    emitPrimitiveLifecycle({
      primitiveType: "process-manager",
      primitiveName: name,
      phase: "emitted",
      context,
      triggerEvent: event._tag,
      ...(nextState !== undefined ? { nextState } : {}),
      emittedCommands,
      terminal: next.isTerminal,
    })
    const completedEvent: {
      primitiveType: "process-manager"
      primitiveName: string
      phase: "completed"
      context: string
      triggerEvent: string
      prevState?: Record<string, unknown>
      nextState?: Record<string, unknown>
      emittedCommands?: ReadonlyArray<string>
      terminal?: boolean
    } = {
      primitiveType: "process-manager",
      primitiveName: name,
      phase: "completed",
      context,
      triggerEvent: event._tag,
      terminal: next.isTerminal,
    }
    if (prevState !== undefined) completedEvent.prevState = prevState
    if (nextState !== undefined) completedEvent.nextState = nextState
    completedEvent.emittedCommands = emittedCommands
    emitPrimitiveLifecycle(completedEvent)
    return next
  })
}
