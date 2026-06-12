// ---------------------------------------------------------------------------
// check-specs — validates PatternSpec, ArchetypeSpec, and ArchetypeInstance
// YAML files against their structural contracts.
//
// Three entry points (one per ARD):
//   checkPatternSpecs     — ARD-T2-001
//   checkPatternContracts — ARD-T2-003
//   checkArchetypeSpecs   — ARD-T3-001
//   checkArchetypeBindings — ARD-T3-002
// ---------------------------------------------------------------------------

import { Effect } from "effect"
import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { parseVocabContent, readVocabFile } from "@rta/vocab"
import type {
  ArchetypeInstanceDeclaration,
  ArchetypeSpecDeclaration,
  BoundedContextDeclaration,
  PatternSpecDeclaration,
  VocabFile,
} from "@rta/vocab"
import { isGoldenFixturePath } from "./discovery.js"

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function discoverFiles(root: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { recursive: true })
    return entries
      .filter((e) => e.endsWith(suffix) && !e.includes("node_modules"))
      .filter((e) => !isGoldenFixturePath(e))
      .map((e) => join(root, e))
  } catch {
    return []
  }
}

async function readTierVocabFile(path: string): Promise<VocabFile> {
  const content = await readFile(path, "utf-8")
  return Effect.runPromise(parseVocabContent(content, path))
}

// ---------------------------------------------------------------------------
// PatternSpec validation (ARD-T2-001)
//
// Required fields: kind, name, requiredPrimitives, testingContract,
//                  vocabHint, visualConcepts, narrativeLabel
// ---------------------------------------------------------------------------

async function loadPatternSpecs(
  cwd: string,
): Promise<Array<{ readonly path: string; readonly spec: PatternSpecDeclaration }>> {
  const paths = await discoverFiles(cwd, ".pattern.yaml")
  const specs: Array<{ path: string; spec: PatternSpecDeclaration }> = []
  for (const path of paths) {
    const parsed = await readTierVocabFile(path)
    if (parsed.kind !== "PatternSpec") {
      throw new Error(`${path}: expected kind "PatternSpec", got "${parsed.kind}"`)
    }
    specs.push({ path, spec: parsed })
  }
  return specs
}

async function loadArchetypeFiles(
  cwd: string,
): Promise<Array<{ readonly path: string; readonly file: ArchetypeSpecDeclaration | ArchetypeInstanceDeclaration }>> {
  const paths = await discoverFiles(cwd, ".archetype.yaml")
  const files: Array<{ path: string; file: ArchetypeSpecDeclaration | ArchetypeInstanceDeclaration }> = []
  for (const path of paths) {
    const parsed = await readTierVocabFile(path)
    if (parsed.kind !== "ArchetypeSpec" && parsed.kind !== "ArchetypeInstance") {
      throw new Error(`${path}: expected ArchetypeSpec or ArchetypeInstance, got "${parsed.kind}"`)
    }
    files.push({ path, file: parsed })
  }
  return files
}

export async function checkPatternSpecs(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverFiles(cwd, ".pattern.yaml")
  if (paths.length === 0) {
    console.log("No *.pattern.yaml files found.")
    return 0
  }

  const errors: string[] = []
  for (const p of paths) {
    try {
      await readTierVocabFile(p)
    } catch (e) {
      errors.push(`  ${p}: ${String(e)}`)
    }
  }
  if (errors.length > 0) {
    console.error(`✗  Pattern spec violations:\n\n${errors.join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(`✓  ${paths.length} pattern spec${paths.length === 1 ? "" : "s"} valid.`)
  return 0
}

const VALID_T1_TESTING_CONTRACTS = new Set([
  "adapter-operation-event",
  "app-wiring-contract",
  "credential-redaction",
  "rule-two-case",
  "decision-outcome-coverage",
  "external-schema-drift",
  "boundary-promotion-pipeline",
  "boundary-sanitization",
  "brand-fitting",
  "deployment-contract",
  "input-schema-validation",
  "openapi-contract",
  "policy-deny-coverage",
  "projection-mount-coverage",
  "runtime-capability-binding",
  "tool-surface-safety",
])

const PATTERN_PRIMITIVE_CONTRACTS: ReadonlyArray<{
  readonly primitives: ReadonlyArray<string>
  readonly contracts: ReadonlyArray<string>
  readonly message: string
}> = [
  {
    primitives: ["AppWiring", "Entrypoint"],
    contracts: ["app-wiring-contract", "brand-fitting"],
    message: "AppWiring/Entrypoint patterns must extend app-wiring-contract or brand-fitting",
  },
  {
    primitives: ["Rule"],
    contracts: ["rule-two-case"],
    message: "Rule patterns must extend rule-two-case",
  },
  {
    primitives: ["Decision", "Reaction"],
    contracts: ["decision-outcome-coverage"],
    message: "Decision/Reaction patterns must extend decision-outcome-coverage",
  },
  {
    primitives: ["InboundAdapter", "OutboundAdapter", "EdgeBoundary"],
    contracts: [
      "adapter-operation-event",
      "boundary-promotion-pipeline",
      "boundary-sanitization",
      "app-wiring-contract",
      "brand-fitting",
      "credential-redaction",
      "external-schema-drift",
      "projection-mount-coverage",
      "runtime-capability-binding",
      "tool-surface-safety",
    ],
    message:
      "Adapter/EdgeBoundary patterns must extend adapter-operation-event, brand-fitting, or tool-surface-safety",
  },
  {
    primitives: ["Policy", "Guardrail"],
    contracts: [
      "credential-redaction",
      "policy-deny-coverage",
      "runtime-capability-binding",
      "tool-surface-safety",
    ],
    message:
      "Policy/Guardrail patterns must extend credential-redaction, policy-deny-coverage, or tool-surface-safety",
  },
  {
    primitives: ["Secret"],
    contracts: ["credential-redaction"],
    message: "Secret patterns must extend credential-redaction",
  },
  {
    primitives: ["Projector"],
    contracts: ["projection-mount-coverage"],
    message: "Projector patterns must extend projection-mount-coverage",
  },
  {
    primitives: ["RuntimeCapability"],
    contracts: ["runtime-capability-binding", "deployment-contract"],
    message: "RuntimeCapability patterns must extend runtime-capability-binding or deployment-contract",
  },
  {
    primitives: ["DeploymentIntent"],
    contracts: ["deployment-contract"],
    message: "DeploymentIntent patterns must extend deployment-contract",
  },
  {
    primitives: ["Port", "AdapterBinding"],
    contracts: ["runtime-capability-binding", "boundary-promotion-pipeline", "brand-fitting"],
    message: "Port/AdapterBinding patterns must extend runtime-capability-binding, boundary-promotion-pipeline, or brand-fitting",
  },
  {
    primitives: ["BoundarySchema"],
    contracts: [
      "boundary-promotion-pipeline",
      "boundary-sanitization",
      "app-wiring-contract",
      "brand-fitting",
      "input-schema-validation",
      "external-schema-drift",
    ],
    message:
      "BoundarySchema patterns must extend boundary-sanitization, app-wiring-contract, brand-fitting, input-schema-validation, boundary-promotion-pipeline, or external-schema-drift",
  },
  {
    primitives: ["PublishedLanguage"],
    contracts: ["openapi-contract", "external-schema-drift"],
    message: "PublishedLanguage patterns must extend openapi-contract or external-schema-drift",
  },
  {
    primitives: ["ExternalSchemaProbe"],
    contracts: ["external-schema-drift"],
    message: "ExternalSchemaProbe patterns must extend external-schema-drift",
  },
]

export async function checkPatternContracts(root: string): Promise<number> {
  const cwd = resolve(root)
  let specs: Array<{ readonly path: string; readonly spec: PatternSpecDeclaration }>
  try {
    specs = await loadPatternSpecs(cwd)
  } catch (e) {
    console.error(`✗  Pattern contract violations:\n\n  ${String(e)}\n`)
    console.error("1 violation → FAIL")
    return 1
  }

  if (specs.length === 0) {
    console.log("No *.pattern.yaml files found.")
    return 0
  }

  const errors: string[] = []

  for (const { spec } of specs) {
    const label = spec.name
    const primitives = spec.requiredPrimitives
    const extendsName = spec.testingContract.extends

    if (!VALID_T1_TESTING_CONTRACTS.has(extendsName)) {
      errors.push(`  ${label}: testingContract.extends must name a valid T1 contract`)
      continue
    }

    for (const constraint of PATTERN_PRIMITIVE_CONTRACTS) {
      const isBoundaryContractPattern =
        primitives.includes("BoundarySchema") || primitives.includes("PublishedLanguage")
      const isGenericAdapterConstraint =
        constraint.primitives.includes("InboundAdapter") ||
        constraint.primitives.includes("OutboundAdapter") ||
        constraint.primitives.includes("EdgeBoundary")
      if (isBoundaryContractPattern && isGenericAdapterConstraint) continue

      if (
        constraint.primitives.some((primitive) => primitives.includes(primitive)) &&
        !constraint.contracts.includes(extendsName)
      ) {
        errors.push(`  ${label}: ${constraint.message}`)
      }
    }
  }

  if (errors.length > 0) {
    console.error(`✗  Pattern contract violations:\n\n${errors.join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(`✓  ${specs.length} pattern contract${specs.length === 1 ? "" : "s"} valid.`)
  return 0
}

// ---------------------------------------------------------------------------
// ArchetypeSpec validation (ARD-T3-001)
//
// Required fields: kind, name, description, requiredPatterns, inputRoles,
//                  outputRoles, testPlan, visualGuidance, narrativeLabel
// Also: requiredPatterns must resolve to registered pattern names.
// ---------------------------------------------------------------------------

export async function checkArchetypeSpecs(root: string): Promise<number> {
  const cwd = resolve(root)

  // Load registered pattern names for requiredPatterns resolution
  let patterns: Array<{ readonly path: string; readonly spec: PatternSpecDeclaration }>
  let archetypeFiles: Array<{ readonly path: string; readonly file: ArchetypeSpecDeclaration | ArchetypeInstanceDeclaration }>
  try {
    patterns = await loadPatternSpecs(cwd)
    archetypeFiles = await loadArchetypeFiles(cwd)
  } catch (e) {
    console.error(`✗  Archetype spec violations:\n\n  ${String(e)}\n`)
    console.error("1 violation → FAIL")
    return 1
  }

  const registeredPatterns = new Set(patterns.map(({ spec }) => spec.name))
  const specPaths = archetypeFiles
    .filter((entry): entry is { readonly path: string; readonly file: ArchetypeSpecDeclaration } =>
      entry.file.kind === "ArchetypeSpec")

  if (specPaths.length === 0) {
    console.log("No ArchetypeSpec files found.")
    return 0
  }

  const errors: string[] = []

  for (const { path: p, file: spec } of specPaths) {
    for (const name of spec.requiredPatterns) {
      if (!registeredPatterns.has(name)) {
        errors.push(`  ${spec.name ?? p}: requiredPatterns references unknown pattern "${name}"`)
      }
    }
  }

  if (errors.length > 0) {
    console.error(`✗  Archetype spec violations:\n\n${errors.join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(`✓  ${specPaths.length} archetype spec${specPaths.length === 1 ? "" : "s"} valid.`)
  return 0
}

// ---------------------------------------------------------------------------
// ArchetypeInstance binding validation (ARD-T3-002)
//
// For each *.archetype.yaml with kind: ArchetypeInstance:
//   1. archetype name resolves to a registered ArchetypeSpec
//   2. all inputRoles declared by the archetype have a binding entry
//   3. each bound event exists in the declared `from` context's aggregate events
// ---------------------------------------------------------------------------

export async function checkArchetypeBindings(root: string): Promise<number> {
  const cwd = resolve(root)

  // Load registered archetypes (ArchetypeSpec files)
  let archetypeFiles: Array<{ readonly path: string; readonly file: ArchetypeSpecDeclaration | ArchetypeInstanceDeclaration }>
  try {
    archetypeFiles = await loadArchetypeFiles(cwd)
  } catch (e) {
    console.error(`✗  Archetype binding violations:\n\n  ${String(e)}\n`)
    console.error("1 violation → FAIL")
    return 1
  }
  const archetypeSpecs = new Map(
    archetypeFiles
      .filter((entry): entry is { readonly path: string; readonly file: ArchetypeSpecDeclaration } =>
        entry.file.kind === "ArchetypeSpec")
      .map(({ file }) => [file.name, file]),
  )
  const instancePaths = archetypeFiles
    .filter((entry): entry is { readonly path: string; readonly file: ArchetypeInstanceDeclaration } =>
      entry.file.kind === "ArchetypeInstance")

  if (instancePaths.length === 0) {
    console.log("No ArchetypeInstance binding files found.")
    return 0
  }

  // Load all context vocab for event existence checks
  const contextPaths = await discoverFiles(cwd, ".context.yaml")
  const contextMap = new Map<string, BoundedContextDeclaration>()
  for (const p of contextPaths) {
    try {
      const parsed = await Effect.runPromise(readVocabFile(p))
      if (parsed.kind === "BoundedContext") contextMap.set(parsed.name, parsed)
    } catch { /* skip */ }
  }

  const errors: string[] = []

  for (const { path: p, file: instance } of instancePaths) {
    const archetypeName = instance.archetype
    const label = `${archetypeName}@${instance.context ?? p}`

    // 1. Archetype name must resolve
    if (!archetypeSpecs.has(archetypeName)) {
      errors.push(`  ${label}: archetype "${archetypeName}" not found in registered specs`)
      continue
    }

    const spec = archetypeSpecs.get(archetypeName)!
    const inputRoles = spec.inputRoles
    const bindings = instance.bindings
    const boundRoles = new Set(bindings.map((b) => b.role))

    // 2. All input roles must be bound
    for (const role of inputRoles) {
      if (!boundRoles.has(role.name)) {
        errors.push(`  ${label}: input role "${role.name}" has no binding`)
      }
    }

    // 3. Each bound event must exist in its `from` context
    for (const binding of bindings) {
      const { role, event, from } = binding
      const ctx = contextMap.get(from)
      if (!ctx) {
        errors.push(`  ${label}: binding for role "${role}" references unknown context "${from}"`)
        continue
      }
      const allEvents = (ctx.aggregates ?? []).flatMap((a) => (a.events ?? []).map((e) => e.name))
      if (!allEvents.includes(event)) {
        errors.push(
          `  ${label}: binding for role "${role}" — event "${event}" not found in ${from}'s aggregates`,
        )
      }
    }
  }

  if (errors.length > 0) {
    console.error(`✗  Archetype binding violations:\n\n${errors.join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(
    `✓  ${instancePaths.length} archetype binding${instancePaths.length === 1 ? "" : "s"} valid.`,
  )
  return 0
}

export async function checkTierContracts(root: string): Promise<number> {
  const checks = [
    ["pattern-specs", () => checkPatternSpecs(root)],
    ["pattern-contracts", () => checkPatternContracts(root)],
    ["archetype-specs", () => checkArchetypeSpecs(root)],
    ["archetype-bindings", () => checkArchetypeBindings(root)],
  ] as const

  let failed = 0
  for (const [label, run] of checks) {
    const code = await run()
    if (code !== 0) {
      failed += 1
      console.error(`tier contract check failed: ${label}`)
    }
  }
  if (failed === 0) {
    console.log("✓  Tier contract check passed.")
    return 0
  }
  console.error(`${failed} tier contract check${failed === 1 ? "" : "s"} failed → FAIL`)
  return 1
}
