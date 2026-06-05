import type {
  BoundedContextDeclaration,
  ConnectionsDeclaration,
  DecisionDeclaration,
  ProcessManagerDeclaration,
  ReactionDeclaration,
  RuleDeclaration,
} from "@rta/vocab"

export interface ExecutionTelemetryExpectation {
  readonly id: string
  readonly primitiveType:
    | "rule"
    | "decision"
    | "reaction"
    | "process-manager"
  readonly context: string
  readonly aggregate?: string
  readonly primitiveName: string
  readonly phases: ReadonlyArray<string>
  readonly description: string
}

const telemetryId = (
  primitiveType: ExecutionTelemetryExpectation["primitiveType"],
  context: string,
  primitiveName: string,
  aggregate?: string,
) =>
  aggregate !== undefined
    ? `${primitiveType}:${context}.${aggregate}.${primitiveName}`
    : `${primitiveType}:${context}.${primitiveName}`

const makeExpectation = (
  primitiveType: ExecutionTelemetryExpectation["primitiveType"],
  context: string,
  primitiveName: string,
  phases: ReadonlyArray<string>,
  description: string,
  aggregate?: string,
): ExecutionTelemetryExpectation => {
  const expectation: {
    id: string
    primitiveType: ExecutionTelemetryExpectation["primitiveType"]
    context: string
    aggregate?: string
    primitiveName: string
    phases: ReadonlyArray<string>
    description: string
  } = {
    id: telemetryId(primitiveType, context, primitiveName, aggregate),
    primitiveType,
    context,
    primitiveName,
    phases,
    description,
  }
  if (aggregate !== undefined) expectation.aggregate = aggregate
  return expectation
}

export const formatTelemetryMarker = (id: string) => `@rta-telemetry ${id}`

export const deriveRuleTelemetry = (
  context: string,
  aggregate: string,
  rule: RuleDeclaration,
): ExecutionTelemetryExpectation =>
  makeExpectation(
    "rule",
    context,
    rule.name,
    ["received", "completed", "failed"],
    "rule emits receive/pass/fail execution phases",
    aggregate,
  )

export const deriveDecisionTelemetry = (
  context: string,
  decision: DecisionDeclaration,
): ExecutionTelemetryExpectation =>
  makeExpectation(
    "decision",
    context,
    decision.name,
    ["received", "completed"],
    "decision emits receive/complete execution phases",
  )

export const deriveReactionTelemetry = (
  context: string,
  reaction: ReactionDeclaration,
): ExecutionTelemetryExpectation =>
  makeExpectation(
    "reaction",
    context,
    reaction.name,
    ["received", "emitted", "completed"],
    "reaction emits receive/emit/complete execution phases",
  )

export const deriveProcessManagerTelemetry = (
  context: string,
  processManager: ProcessManagerDeclaration,
): ExecutionTelemetryExpectation =>
  makeExpectation(
    "process-manager",
    context,
    processManager.name,
    ["received", "state-changed", "emitted", "completed", "failed"],
    "process manager emits receive/state/emission/completion execution phases",
  )

export const deriveContextTelemetry = (
  context: BoundedContextDeclaration,
): ReadonlyArray<ExecutionTelemetryExpectation> => [
  ...(context.aggregates ?? []).flatMap((aggregate) =>
    (aggregate.rules ?? []).map((rule) =>
      deriveRuleTelemetry(context.name, aggregate.name, rule),
    ),
  ),
  ...(context.decisions ?? []).map((decision) =>
    deriveDecisionTelemetry(context.name, decision),
  ),
  ...(context.processManagers ?? []).map((processManager) =>
    deriveProcessManagerTelemetry(context.name, processManager),
  ),
]

export const deriveConnectionsTelemetry = (
  connections: ConnectionsDeclaration,
): ReadonlyArray<ExecutionTelemetryExpectation> =>
  (connections.reactions ?? []).map((reaction) =>
    deriveReactionTelemetry(connections.context, reaction),
  )
