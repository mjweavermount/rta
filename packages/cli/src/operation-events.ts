import type {
  BoundedContextDeclaration,
  ConnectionsDeclaration,
  DecisionDeclaration,
  ProcessManagerDeclaration,
  ReactionDeclaration,
  RuleDeclaration,
} from "@rta/vocab"

export interface OperationEventContract {
  readonly id: string
  readonly primitiveType:
    | "rule"
    | "decision"
    | "reaction"
    | "process-manager"
  readonly context: string
  readonly aggregate?: string
  readonly primitiveName: string
  readonly requiredPhases: ReadonlyArray<string>
  readonly requiredReadableSummary: boolean
  readonly description: string
}

const operationEventId = (
  primitiveType: OperationEventContract["primitiveType"],
  context: string,
  primitiveName: string,
  aggregate?: string,
) =>
  aggregate !== undefined
    ? `${primitiveType}:${context}.${aggregate}.${primitiveName}`
    : `${primitiveType}:${context}.${primitiveName}`

const makeContract = (
  primitiveType: OperationEventContract["primitiveType"],
  context: string,
  primitiveName: string,
  requiredPhases: ReadonlyArray<string>,
  description: string,
  aggregate?: string,
): OperationEventContract => {
  const contract: {
    id: string
    primitiveType: OperationEventContract["primitiveType"]
    context: string
    aggregate?: string
    primitiveName: string
    requiredPhases: ReadonlyArray<string>
    requiredReadableSummary: boolean
    description: string
  } = {
    id: operationEventId(primitiveType, context, primitiveName, aggregate),
    primitiveType,
    context,
    primitiveName,
    requiredPhases,
    requiredReadableSummary: true,
    description,
  }
  if (aggregate !== undefined) contract.aggregate = aggregate
  return contract
}

export const formatOperationEventMarker = (id: string) => `@rta-operation-event ${id}`

export const deriveRuleOperationEventContract = (
  context: string,
  aggregate: string,
  rule: RuleDeclaration,
): OperationEventContract =>
  makeContract(
    "rule",
    context,
    rule.name,
    ["received", "completed", "failed"],
    "rule emits readable accept/reject/fail operation logs",
    aggregate,
  )

export const deriveDecisionOperationEventContract = (
  context: string,
  decision: DecisionDeclaration,
): OperationEventContract =>
  makeContract(
    "decision",
    context,
    decision.name,
    ["received", "completed"],
    "decision emits readable input/outcome operation logs",
  )

export const deriveReactionOperationEventContract = (
  context: string,
  reaction: ReactionDeclaration,
): OperationEventContract =>
  makeContract(
    "reaction",
    context,
    reaction.name,
    ["received", "emitted", "completed"],
    "reaction emits readable trigger and emitted-command operation logs",
  )

export const deriveProcessManagerOperationEventContract = (
  context: string,
  processManager: ProcessManagerDeclaration,
): OperationEventContract =>
  makeContract(
    "process-manager",
    context,
    processManager.name,
    ["received", "state-changed", "emitted", "completed", "failed"],
    "process manager emits readable transition, emission, and terminal-state operation logs",
  )

export const deriveContextOperationEventContracts = (
  context: BoundedContextDeclaration,
): ReadonlyArray<OperationEventContract> => [
  ...(context.aggregates ?? []).flatMap((aggregate) =>
    (aggregate.rules ?? []).map((rule) =>
      deriveRuleOperationEventContract(context.name, aggregate.name, rule),
    ),
  ),
  ...(context.decisions ?? []).map((decision) =>
    deriveDecisionOperationEventContract(context.name, decision),
  ),
  ...(context.processManagers ?? []).map((processManager) =>
    deriveProcessManagerOperationEventContract(context.name, processManager),
  ),
]

export const deriveConnectionsOperationEventContracts = (
  connections: ConnectionsDeclaration,
): ReadonlyArray<OperationEventContract> =>
  (connections.reactions ?? []).map((reaction) =>
    deriveReactionOperationEventContract(connections.context, reaction),
  )
