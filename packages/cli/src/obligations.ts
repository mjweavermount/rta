import type {
  BoundedContextDeclaration,
  ConnectionsDeclaration,
  DecisionDeclaration,
  ProcessManagerDeclaration,
  ReactionDeclaration,
  RuleDeclaration,
} from "@rta/vocab"

export interface Obligation {
  readonly id: string
  readonly primitiveType: "rule" | "decision" | "reaction" | "process-manager"
  readonly context: string
  readonly aggregate?: string
  readonly primitiveName: string
  readonly description: string
}

const decisionShapeObligations: Record<string, ReadonlyArray<{ suffix: string; description: string }>> = {
  "numeric-buckets": [
    {
      suffix: "bucket-boundaries",
      description: "numeric bucket boundaries are exercised",
    },
    {
      suffix: "bucket-exhaustiveness",
      description: "numeric buckets cover the full supported range",
    },
  ],
  "lookup-table": [
    {
      suffix: "known-key-routing",
      description: "known lookup keys route to declared outcomes",
    },
    {
      suffix: "fallback-routing",
      description: "unknown lookup keys follow the fallback path",
    },
  ],
  "predicate-chain": [
    {
      suffix: "first-match-ordering",
      description: "predicate ordering is exercised",
    },
    {
      suffix: "fallback-outcome",
      description: "fallback outcome is exercised",
    },
  ],
  scorecard: [
    {
      suffix: "score-thresholds",
      description: "score thresholds are exercised",
    },
    {
      suffix: "tie-breaker",
      description: "tie-break behavior is exercised",
    },
  ],
  matrix: [
    {
      suffix: "matrix-coverage",
      description: "representative matrix cells are exercised",
    },
    {
      suffix: "default-cell",
      description: "matrix fallback/default path is exercised",
    },
  ],
}

const decisionPatternObligations: Record<string, ReadonlyArray<{ suffix: string; description: string }>> = {
  lifecycle: [
    {
      suffix: "representative-progression",
      description: "a representative lifecycle progression is exercised",
    },
  ],
}

const reactionShapeObligations: Record<string, ReadonlyArray<{ suffix: string; description: string }>> = {
  "single-dispatch": [],
  "fan-out": [
    {
      suffix: "fan-out-complete",
      description: "all declared downstream dispatches are exercised",
    },
  ],
  "conditional-dispatch": [
    {
      suffix: "dispatch-condition",
      description: "conditional dispatch path is exercised",
    },
  ],
  "idempotent-upsert": [
    {
      suffix: "idempotent-replay",
      description: "repeated trigger handling remains idempotent",
    },
  ],
}

const processManagerShapeObligations: Record<string, ReadonlyArray<{ suffix: string; description: string }>> = {
  "linear-flow": [
    {
      suffix: "linear-progression",
      description: "the nominal process flow is exercised end to end",
    },
  ],
  "branching-flow": [
    {
      suffix: "branch-coverage",
      description: "representative alternate branches are exercised",
    },
  ],
  "retrying-flow": [
    {
      suffix: "retry-progression",
      description: "retry progression is exercised",
    },
  ],
  "timeout-aware": [
    {
      suffix: "timeout-path",
      description: "timeout handling path is exercised",
    },
  ],
}

const ruleShapeObligations: Record<string, ReadonlyArray<{ suffix: string; description: string }>> = {
  predicate: [],
  "state-precondition": [
    {
      suffix: "valid-pre-state",
      description: "rule passes in the required pre-state",
    },
    {
      suffix: "wrong-state",
      description: "rule fails outside the required pre-state",
    },
  ],
  exclusivity: [
    {
      suffix: "unclaimed",
      description: "rule passes when the resource is unclaimed",
    },
    {
      suffix: "already-claimed",
      description: "rule fails when the resource is already claimed",
    },
  ],
  "cross-field-consistency": [
    {
      suffix: "consistent-fields",
      description: "rule passes when related fields are consistent",
    },
    {
      suffix: "inconsistent-fields",
      description: "rule fails when related fields are inconsistent",
    },
  ],
}

const obligationId = (
  primitiveType: Obligation["primitiveType"],
  context: string,
  primitiveName: string,
  suffix: string,
  aggregate?: string,
) =>
  aggregate !== undefined
    ? `${primitiveType}:${context}.${aggregate}.${primitiveName}:${suffix}`
    : `${primitiveType}:${context}.${primitiveName}:${suffix}`

const makeRuleObligation = (
  context: string,
  aggregate: string,
  rule: RuleDeclaration,
  suffix: string,
  description: string,
): Obligation => ({
  id: obligationId("rule", context, rule.name, suffix, aggregate),
  primitiveType: "rule",
  context,
  aggregate,
  primitiveName: rule.name,
  description,
})

const makeDecisionObligation = (
  context: string,
  decision: DecisionDeclaration,
  suffix: string,
  description: string,
): Obligation => ({
  id: obligationId("decision", context, decision.name, suffix),
  primitiveType: "decision",
  context,
  primitiveName: decision.name,
  description,
})

export const deriveRuleObligations = (
  context: string,
  aggregate: string,
  rule: RuleDeclaration,
): ReadonlyArray<Obligation> => [
  makeRuleObligation(
    context,
    aggregate,
    rule,
    "pass-case",
    "rule passes for a valid case",
  ),
  makeRuleObligation(
    context,
    aggregate,
    rule,
    "fail-case",
    `rule fails with ${rule.violation}`,
  ),
  ...((rule.implementation?.shape !== undefined
    ? ruleShapeObligations[rule.implementation.shape] ?? []
    : []
  ).map((item) =>
    makeRuleObligation(context, aggregate, rule, item.suffix, item.description),
  )),
]

export const deriveDecisionObligations = (
  context: string,
  decision: DecisionDeclaration,
): ReadonlyArray<Obligation> => [
  ...decision.outcomes.map((outcome) =>
    makeDecisionObligation(
      context,
      decision,
      `outcome:${outcome}`,
      `decision returns declared outcome ${outcome}`,
    ),
  ),
  ...((decision.implementation?.shape !== undefined
    ? decisionShapeObligations[decision.implementation.shape] ?? []
    : []
  ).map((item) =>
    makeDecisionObligation(context, decision, item.suffix, item.description),
  )),
  ...((decision.pattern !== undefined
    ? decisionPatternObligations[decision.pattern] ?? []
    : []
  ).map((item) =>
    makeDecisionObligation(context, decision, item.suffix, item.description),
  )),
]

const makeReactionObligation = (
  context: string,
  reaction: ReactionDeclaration,
  suffix: string,
  description: string,
): Obligation => ({
  id: obligationId("reaction", context, reaction.name, suffix),
  primitiveType: "reaction",
  context,
  primitiveName: reaction.name,
  description,
})

export const deriveReactionObligations = (
  context: string,
  reaction: ReactionDeclaration,
): ReadonlyArray<Obligation> => [
  makeReactionObligation(
    context,
    reaction,
    "trigger-handled",
    `reaction handles ${reaction.trigger.event}`,
  ),
  ...reaction.emits.map((emit) =>
    makeReactionObligation(
      context,
      reaction,
      `emit:${emit.command}:to:${emit.to}`,
      `reaction emits ${emit.command} to ${emit.to}`,
    ),
  ),
  ...((reaction.implementation?.shape !== undefined
    ? reactionShapeObligations[reaction.implementation.shape] ?? []
    : []
  ).map((item) =>
    makeReactionObligation(context, reaction, item.suffix, item.description),
  )),
]

const makeProcessManagerObligation = (
  context: string,
  processManager: ProcessManagerDeclaration,
  suffix: string,
  description: string,
): Obligation => ({
  id: obligationId("process-manager", context, processManager.name, suffix),
  primitiveType: "process-manager",
  context,
  primitiveName: processManager.name,
  description,
})

export const deriveProcessManagerObligations = (
  context: string,
  processManager: ProcessManagerDeclaration,
): ReadonlyArray<Obligation> => [
  makeProcessManagerObligation(
    context,
    processManager,
    "trigger-starts-instance",
    `process manager starts on ${processManager.trigger.event}`,
  ),
  ...processManager.transitions.flatMap((transition) => [
    makeProcessManagerObligation(
      context,
      processManager,
      `transition:${transition.on}`,
      `process manager handles transition ${transition.on}`,
    ),
    ...(transition.emits ?? []).map((command) =>
      makeProcessManagerObligation(
        context,
        processManager,
        `emit:${transition.on}:${command}`,
        `transition ${transition.on} emits ${command}`,
      ),
    ),
    ...(transition.terminal
      ? [
          makeProcessManagerObligation(
            context,
            processManager,
            `terminal:${transition.on}`,
            `transition ${transition.on} reaches terminal state`,
          ),
        ]
      : []),
  ]),
  ...((processManager.implementation?.shape !== undefined
    ? processManagerShapeObligations[processManager.implementation.shape] ?? []
    : []
  ).map((item) =>
    makeProcessManagerObligation(
      context,
      processManager,
      item.suffix,
      item.description,
    ),
  )),
]

export const deriveContextObligations = (
  context: BoundedContextDeclaration,
): ReadonlyArray<Obligation> => [
  ...(context.aggregates ?? []).flatMap((aggregate) =>
    (aggregate.rules ?? []).flatMap((rule) =>
      deriveRuleObligations(context.name, aggregate.name, rule),
    ),
  ),
  ...(context.decisions ?? []).flatMap((decision) =>
    deriveDecisionObligations(context.name, decision),
  ),
  ...(context.processManagers ?? []).flatMap((processManager) =>
    deriveProcessManagerObligations(context.name, processManager),
  ),
]

export const deriveConnectionsObligations = (
  connections: ConnectionsDeclaration,
): ReadonlyArray<Obligation> =>
  (connections.reactions ?? []).flatMap((reaction) =>
    deriveReactionObligations(connections.context, reaction),
  )

export const formatObligationMarker = (id: string) => `@rta-obligation ${id}`
