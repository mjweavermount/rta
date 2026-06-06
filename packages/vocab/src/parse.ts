import { Data, Effect, Schema, pipe } from "effect"
import { parse as parseYaml } from "yaml"
import { readFile } from "node:fs/promises"
import {
  VocabFile,
  type AggregateDeclaration,
  type BoundedContextDeclaration,
  type DecisionDeclaration,
  type ProcessManagerDeclaration,
  type ReactionDeclaration,
  type RuleDeclaration,
} from "./schemas/index.js"

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class VocabParseError extends Data.TaggedError("VocabParseError")<{
  readonly path: string
  readonly cause: unknown
}> {}

const DECISION_PATTERN_SHAPE_COMPATIBILITY: Record<string, ReadonlyArray<string>> = {
  classifier: ["numeric-buckets", "lookup-table", "predicate-chain", "scorecard", "matrix"],
  lifecycle: ["lookup-table", "predicate-chain", "matrix"],
  eligibility: ["numeric-buckets", "lookup-table", "predicate-chain", "matrix"],
  prioritization: ["numeric-buckets", "predicate-chain", "scorecard"],
  routing: ["lookup-table", "predicate-chain", "matrix"],
}

const RULE_PATTERN_SHAPE_COMPATIBILITY: Record<string, ReadonlyArray<string>> = {
  guard: ["predicate", "state-precondition"],
  availability: ["predicate", "exclusivity"],
}

const REACTION_PATTERN_SHAPE_COMPATIBILITY: Record<string, ReadonlyArray<string>> = {
  "command-emitter": ["single-dispatch", "fan-out", "conditional-dispatch"],
  notification: ["single-dispatch", "fan-out"],
  "integration-bridge": ["single-dispatch", "fan-out", "conditional-dispatch", "idempotent-upsert"],
  "projection-updater": ["idempotent-upsert", "conditional-dispatch"],
}

const PROCESS_MANAGER_PATTERN_SHAPE_COMPATIBILITY: Record<string, ReadonlyArray<string>> = {
  saga: ["linear-flow", "branching-flow", "retrying-flow"],
  "retry-loop": ["retrying-flow", "branching-flow"],
  "approval-flow": ["linear-flow", "branching-flow", "timeout-aware"],
  "compensation-flow": ["branching-flow", "retrying-flow"],
  lifecycle: ["linear-flow", "branching-flow"],
}

const validateDecisionDeclaration = (
  decision: DecisionDeclaration,
  label: string,
): ReadonlyArray<string> => {
  const pattern = decision.pattern
  const shape = decision.implementation?.shape
  if (!pattern || !shape) return []

  const compatibleShapes = DECISION_PATTERN_SHAPE_COMPATIBILITY[pattern]
  if (compatibleShapes && !compatibleShapes.includes(shape)) {
    return [
      `${label}: pattern "${pattern}" is incompatible with implementation.shape "${shape}"`,
    ]
  }

  return []
}

const validateRuleDeclaration = (
  rule: RuleDeclaration,
  label: string,
): ReadonlyArray<string> => {
  const pattern = rule.pattern
  const shape = rule.implementation?.shape
  if (!pattern || !shape) return []

  const compatibleShapes = RULE_PATTERN_SHAPE_COMPATIBILITY[pattern]
  if (compatibleShapes && !compatibleShapes.includes(shape)) {
    return [
      `${label}: pattern "${pattern}" is incompatible with implementation.shape "${shape}"`,
    ]
  }

  return []
}

const validateReactionDeclaration = (
  reaction: ReactionDeclaration,
  label: string,
): ReadonlyArray<string> => {
  const pattern = reaction.pattern
  const shape = reaction.implementation?.shape
  if (!pattern || !shape) return []

  const compatibleShapes = REACTION_PATTERN_SHAPE_COMPATIBILITY[pattern]
  if (compatibleShapes && !compatibleShapes.includes(shape)) {
    return [
      `${label}: pattern "${pattern}" is incompatible with implementation.shape "${shape}"`,
    ]
  }

  return []
}

const validateProcessManagerDeclaration = (
  processManager: ProcessManagerDeclaration,
  label: string,
): ReadonlyArray<string> => {
  const pattern = processManager.pattern
  const shape = processManager.implementation?.shape
  if (!pattern || !shape) return []

  const compatibleShapes = PROCESS_MANAGER_PATTERN_SHAPE_COMPATIBILITY[pattern]
  if (compatibleShapes && !compatibleShapes.includes(shape)) {
    return [
      `${label}: pattern "${pattern}" is incompatible with implementation.shape "${shape}"`,
    ]
  }

  return []
}

const validateAggregateDeclaration = (
  aggregate: AggregateDeclaration,
  contextName: string,
): ReadonlyArray<string> => [
  ...(aggregate.rules ?? []).flatMap((rule) =>
    validateRuleDeclaration(
      rule,
      `${contextName}.aggregate.${aggregate.name}.rule.${rule.name}`,
    ),
  ),
  ...(aggregate.decisions ?? []).flatMap((decision) =>
    validateDecisionDeclaration(
      decision,
      `${contextName}.aggregate.${aggregate.name}.decision.${decision.name}`,
    ),
  ),
]

const validateToolSurfaces = (
  context: BoundedContextDeclaration,
): ReadonlyArray<string> => {
  const declaredCapabilities = new Set(
    (context.runtimeCapabilities ?? []).map((capability) => capability.name),
  )
  const requiresCredential = new Set(["write", "destructive", "admin"])

  return (context.toolSurfaces ?? []).flatMap((surface) => {
    const surfaceLabel = `${context.name}.toolSurface.${surface.name}`
    const surfaceCapabilityIssues = (surface.runtimeCapabilities ?? [])
      .filter((name) => !declaredCapabilities.has(name))
      .map((name) => `${surfaceLabel}: references unknown runtime capability "${name}"`)

    const toolIssues = surface.tools.flatMap((tool) => {
      const toolLabel = `${surfaceLabel}.tool.${tool.name}`
      const referencedCapabilities = [
        ...(surface.runtimeCapabilities ?? []),
        ...(tool.runtimeCapabilities ?? []),
      ]
      const capabilityIssues = referencedCapabilities
        .filter((name) => !declaredCapabilities.has(name))
        .map((name) => `${toolLabel}: references unknown runtime capability "${name}"`)
      const failClosedIssues =
        tool.safety === "fail-closed" && !tool.failClosedReason
          ? [`${toolLabel}: fail-closed tools must declare failClosedReason`]
          : []
      const credentialIssues =
        requiresCredential.has(tool.safety) && tool.credentialMode === "none"
          ? [`${toolLabel}: ${tool.safety} tools must not use credentialMode "none"`]
          : []

      return [...capabilityIssues, ...failClosedIssues, ...credentialIssues]
    })

    return [...surfaceCapabilityIssues, ...toolIssues]
  })
}

const validateBoundaryContracts = (
  context: BoundedContextDeclaration,
): ReadonlyArray<string> => {
  const ports = new Set((context.ports ?? []).map((port) => port.name))
  const boundarySchemas = new Set((context.boundarySchemas ?? []).map((schema) => schema.name))
  const edgeAdapterModes = new Set(["file-backed", "http", "graphql", "mcp", "sql", "home-lab", "fake"])
  const issues: string[] = []

  for (const schema of context.boundarySchemas ?? []) {
    const label = `${context.name}.boundarySchema.${schema.name}`
    if ((schema.kind === "dto" || schema.kind === "input") && !schema.validation.required) {
      issues.push(`${label}: input/DTO boundary schemas must require validation`)
    }
    if (!schema.sanitization.required) {
      issues.push(`${label}: boundary schemas must require sanitization`)
    }
    if (schema.source === "openapi" && !schema.openapiRef) {
      issues.push(`${label}: OpenAPI-sourced boundary schemas must declare openapiRef`)
    }
  }

  for (const port of context.ports ?? []) {
    const label = `${context.name}.port.${port.name}`
    for (const schemaName of [...(port.inputSchemas ?? []), ...(port.outputSchemas ?? [])]) {
      if (!boundarySchemas.has(schemaName)) {
        issues.push(`${label}: references unknown boundary schema "${schemaName}"`)
      }
    }
  }

  for (const binding of context.adapterBindings ?? []) {
    const label = `${context.name}.adapterBinding.${binding.name}`
    if (!ports.has(binding.port)) {
      issues.push(`${label}: references unknown port "${binding.port}"`)
    }
    if (binding.configSchema && !boundarySchemas.has(binding.configSchema)) {
      issues.push(`${label}: references unknown config schema "${binding.configSchema}"`)
    }
    if (edgeAdapterModes.has(binding.mode) && !binding.boundaryPipeline) {
      issues.push(`${label}: edge adapter bindings must declare boundaryPipeline`)
    }
    if (binding.boundaryPipeline) {
      const pipeline = binding.boundaryPipeline
      if (!boundarySchemas.has(pipeline.inputSchema)) {
        issues.push(`${label}: boundaryPipeline references unknown input schema "${pipeline.inputSchema}"`)
      }
      if (pipeline.outputSchema && !boundarySchemas.has(pipeline.outputSchema)) {
        issues.push(`${label}: boundaryPipeline references unknown output schema "${pipeline.outputSchema}"`)
      }
      if (!pipeline.decode) issues.push(`${label}: boundaryPipeline.decode must be true`)
      if (!pipeline.sanitize) issues.push(`${label}: boundaryPipeline.sanitize must be true`)
      if (!pipeline.normalize) issues.push(`${label}: boundaryPipeline.normalize must be true`)
      if (!pipeline.authorize) issues.push(`${label}: boundaryPipeline.authorize must be true`)
      if (!pipeline.logs.promotion) issues.push(`${label}: boundaryPipeline.logs.promotion must be true`)
      if (!pipeline.logs.rejection) issues.push(`${label}: boundaryPipeline.logs.rejection must be true`)
    }
  }

  for (const language of context.publishedLanguages ?? []) {
    const label = `${context.name}.publishedLanguage.${language.name}`
    for (const schemaName of language.boundarySchemas) {
      if (!boundarySchemas.has(schemaName)) {
        issues.push(`${label}: references unknown boundary schema "${schemaName}"`)
      }
    }
    for (const portName of language.ports ?? []) {
      if (!ports.has(portName)) {
        issues.push(`${label}: references unknown port "${portName}"`)
      }
    }
  }

  return issues
}

const validateContextDeclaration = (
  context: BoundedContextDeclaration,
): ReadonlyArray<string> => [
  ...(context.aggregates ?? []).flatMap((aggregate) =>
    validateAggregateDeclaration(aggregate, context.name),
  ),
  ...(context.decisions ?? []).flatMap((decision) =>
    validateDecisionDeclaration(
      decision,
      `${context.name}.decision.${decision.name}`,
    ),
  ),
  ...(context.processManagers ?? []).flatMap((processManager) =>
    validateProcessManagerDeclaration(
      processManager,
      `${context.name}.processManager.${processManager.name}`,
    ),
  ),
  ...validateToolSurfaces(context),
  ...validateBoundaryContracts(context),
]

const validateConnectionsDeclaration = (
  connections: Extract<VocabFile, { kind: "Connections" }>,
): ReadonlyArray<string> =>
  (connections.reactions ?? []).flatMap((reaction) =>
    validateReactionDeclaration(
      reaction,
      `${connections.context}.reaction.${reaction.name}`,
    ),
  )

const validateVocabFile = (
  parsed: VocabFile,
  path: string,
): Effect.Effect<VocabFile, VocabParseError> => {
  const issues =
    parsed.kind === "BoundedContext"
      ? validateContextDeclaration(parsed)
      : parsed.kind === "Connections"
        ? validateConnectionsDeclaration(parsed)
        : []
  if (issues.length === 0) {
    return Effect.succeed(parsed)
  }

  return Effect.fail(
    new VocabParseError({
      path,
      cause: new Error(issues.join("; ")),
    }),
  )
}

// ---------------------------------------------------------------------------
// Core: parse a raw YAML string into a validated VocabFile
//
// Separated from file I/O so tests can work with strings directly.
// ---------------------------------------------------------------------------

export const parseVocabContent = (
  content: string,
  path = "<string>",
): Effect.Effect<VocabFile, VocabParseError> =>
  pipe(
    Effect.try({
      try: () => parseYaml(content) as unknown,
      catch: (cause) => new VocabParseError({ path, cause }),
    }),
    Effect.flatMap((raw) =>
      Schema.decodeUnknown(VocabFile)(raw).pipe(
        Effect.mapError((cause) => new VocabParseError({ path, cause })),
      ),
    ),
    Effect.flatMap((parsed) => validateVocabFile(parsed, path)),
  )

// ---------------------------------------------------------------------------
// Read + parse a vocab file from disk
// ---------------------------------------------------------------------------

export const readVocabFile = (path: string): Effect.Effect<VocabFile, VocabParseError> =>
  pipe(
    Effect.tryPromise({
      try: () => readFile(path, "utf-8"),
      catch: (cause) => new VocabParseError({ path, cause }),
    }),
    Effect.flatMap((content) => parseVocabContent(content, path)),
  )
