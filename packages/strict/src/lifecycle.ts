export type PrimitivePhase =
  | "received"
  | "started"
  | "state-changed"
  | "completed"
  | "failed"
  | "emitted"

export interface PrimitiveOperationSummary {
  readonly action: string
  readonly reason: string
  readonly with?: ReadonlyArray<string>
  readonly input?: string
  readonly output?: string
  readonly lineage?: ReadonlyArray<string>
  readonly boundary?: {
    readonly system: string
    readonly operation: string
    readonly mode: "dry-run" | "staged" | "committed" | "read"
    readonly reviewRequired?: boolean
  }
  readonly details?: Readonly<Record<string, unknown>>
}

export interface CommandHandlerLifecycleEvent {
  readonly primitiveType: "command-handler"
  readonly primitiveName: string
  readonly phase: "received" | "started" | "completed" | "failed"
  readonly messageTag: string
  readonly context: string
  readonly correlationId: string
  readonly causationId: string
  readonly messageId: string
  readonly summary?: PrimitiveOperationSummary
}

export interface QueryHandlerLifecycleEvent {
  readonly primitiveType: "query-handler"
  readonly primitiveName: string
  readonly phase: "received" | "started" | "completed" | "failed"
  readonly messageTag: string
  readonly context: string
  readonly correlationId: string
  readonly summary?: PrimitiveOperationSummary
}

export interface EventHandlerLifecycleEvent {
  readonly primitiveType: "event-handler"
  readonly primitiveName: string
  readonly phase: "received" | "started" | "completed" | "failed"
  readonly messageTag: string
  readonly context: string
  readonly correlationId: string
  readonly causationId: string
  readonly messageId: string
  readonly summary?: PrimitiveOperationSummary
}

export interface RuleLifecycleEvent {
  readonly primitiveType: "rule"
  readonly primitiveName: string
  readonly phase: "received" | "completed" | "failed"
  readonly aggregate: string
  readonly context: string
  readonly input?: Record<string, unknown>
  readonly violation?: string
  readonly message?: string
  readonly summary?: PrimitiveOperationSummary
}

export interface DecisionLifecycleEvent {
  readonly primitiveType: "decision"
  readonly primitiveName: string
  readonly phase: "received" | "completed"
  readonly context: string
  readonly input?: Record<string, unknown>
  readonly outcome?: string
  readonly summary?: PrimitiveOperationSummary
}

export interface EventLifecycleEvent {
  readonly primitiveType: "event"
  readonly primitiveName: string
  readonly phase: "emitted"
  readonly from: string
  readonly to: string
  readonly payload?: Record<string, unknown>
  readonly correlationId: string
  readonly causationId: string
  readonly messageId: string
  readonly summary?: PrimitiveOperationSummary
}

export interface ReactionLifecycleEvent {
  readonly primitiveType: "reaction"
  readonly primitiveName: string
  readonly phase: "received" | "emitted" | "completed"
  readonly context: string
  readonly triggerEvent: string
  readonly from: string
  readonly to: string
  readonly emittedCommands: ReadonlyArray<string>
  readonly summary?: PrimitiveOperationSummary
}

export interface ProcessManagerLifecycleEvent {
  readonly primitiveType: "process-manager"
  readonly primitiveName: string
  readonly phase: "received" | "state-changed" | "emitted" | "completed" | "failed"
  readonly context: string
  readonly triggerEvent: string
  readonly prevState?: Record<string, unknown>
  readonly nextState?: Record<string, unknown>
  readonly emittedCommands?: ReadonlyArray<string>
  readonly terminal?: boolean
  readonly message?: string
  readonly summary?: PrimitiveOperationSummary
}

export interface GenericPrimitiveLifecycleEvent {
  readonly primitiveType:
    | "inbound-adapter"
    | "outbound-adapter"
    | "bounded-context"
    | "scheduler"
    | "job"
    | "projector"
    | "repository"
    | "edge-boundary"
    | "secret"
    | "policy"
    | "guardrail"
  readonly primitiveName: string
  readonly phase: "received" | "started" | "completed" | "failed"
  readonly context: string
  readonly correlationId: string
  readonly causationId: string
  readonly messageId: string
  readonly summary?: PrimitiveOperationSummary
}

export type PrimitiveLifecycleEvent =
  | CommandHandlerLifecycleEvent
  | DecisionLifecycleEvent
  | EventLifecycleEvent
  | EventHandlerLifecycleEvent
  | GenericPrimitiveLifecycleEvent
  | ProcessManagerLifecycleEvent
  | QueryHandlerLifecycleEvent
  | ReactionLifecycleEvent
  | RuleLifecycleEvent

// Legacy name kept for compatibility while the repo converges on
// "execution telemetry" terminology in docs and CLI.
export type PrimitiveExecutionEvent = PrimitiveLifecycleEvent

export type PrimitiveLifecycleSubscriber = (event: PrimitiveLifecycleEvent) => void

const subscribers = new Set<PrimitiveLifecycleSubscriber>()

export function subscribePrimitiveLifecycle(
  fn: PrimitiveLifecycleSubscriber,
): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function emitPrimitiveLifecycle(event: PrimitiveLifecycleEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event)
  }
}
