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
import { parse } from "yaml"
import { readVocabFile } from "@rta/vocab"
import type { BoundedContextDeclaration } from "@rta/vocab"
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

async function readYaml(path: string): Promise<unknown> {
  const content = await readFile(path, "utf-8")
  return parse(content)
}

// ---------------------------------------------------------------------------
// PatternSpec validation (ARD-T2-001)
//
// Required fields: kind, name, requiredPrimitives, testingContract,
//                  vocabHint, visualConcepts, narrativeLabel
// ---------------------------------------------------------------------------

const PATTERN_REQUIRED = [
  "kind",
  "name",
  "requiredPrimitives",
  "testingContract",
  "vocabHint",
  "visualConcepts",
  "narrativeLabel",
] as const

export async function checkPatternSpecs(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverFiles(cwd, ".pattern.yaml")

  if (paths.length === 0) {
    console.log("No *.pattern.yaml files found.")
    return 0
  }

  const errors: string[] = []

  for (const p of paths) {
    let raw: Record<string, unknown>
    try {
      raw = (await readYaml(p)) as Record<string, unknown>
    } catch (e) {
      errors.push(`  ${p}: failed to parse YAML — ${String(e)}`)
      continue
    }

    const missing = PATTERN_REQUIRED.filter((f) => raw[f] === undefined || raw[f] === null)
    if (missing.length > 0) {
      errors.push(`  ${raw["name"] ?? p}: missing fields: ${missing.join(", ")}`)
    }

    if (raw["kind"] !== "PatternSpec") {
      errors.push(`  ${raw["name"] ?? p}: kind must be "PatternSpec", got "${raw["kind"]}"`)
    }

    const vc = raw["visualConcepts"]
    if (!Array.isArray(vc) || vc.length === 0) {
      errors.push(`  ${raw["name"] ?? p}: visualConcepts must be a non-empty array of strings`)
    }

    const tc = raw["testingContract"] as Record<string, unknown> | undefined
    if (!tc || typeof tc !== "object" || !tc["extends"]) {
      errors.push(`  ${raw["name"] ?? p}: testingContract must have an "extends" field`)
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
  "credential-redaction",
  "rule-two-case",
  "decision-outcome-coverage",
  "external-schema-drift",
  "boundary-promotion-pipeline",
  "boundary-sanitization",
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
      "external-schema-drift",
      "projection-mount-coverage",
      "runtime-capability-binding",
      "tool-surface-safety",
    ],
    message:
      "Adapter/EdgeBoundary patterns must extend adapter-operation-event or tool-surface-safety",
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
    contracts: ["runtime-capability-binding"],
    message: "RuntimeCapability patterns must extend runtime-capability-binding",
  },
  {
    primitives: ["Port", "AdapterBinding"],
    contracts: ["runtime-capability-binding", "boundary-promotion-pipeline"],
    message: "Port/AdapterBinding patterns must extend runtime-capability-binding or boundary-promotion-pipeline",
  },
  {
    primitives: ["BoundarySchema"],
    contracts: [
      "boundary-promotion-pipeline",
      "boundary-sanitization",
      "input-schema-validation",
      "external-schema-drift",
    ],
    message:
      "BoundarySchema patterns must extend boundary-sanitization, input-schema-validation, boundary-promotion-pipeline, or external-schema-drift",
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
  const paths = await discoverFiles(cwd, ".pattern.yaml")

  if (paths.length === 0) {
    console.log("No *.pattern.yaml files found.")
    return 0
  }

  const errors: string[] = []

  for (const p of paths) {
    let raw: Record<string, unknown>
    try {
      raw = (await readYaml(p)) as Record<string, unknown>
    } catch (e) {
      errors.push(`  ${p}: failed to parse YAML — ${String(e)}`)
      continue
    }

    const label = String(raw["name"] ?? p)
    const primitives = Array.isArray(raw["requiredPrimitives"])
      ? raw["requiredPrimitives"].filter((value): value is string => typeof value === "string")
      : []
    const testingContract = raw["testingContract"] as Record<string, unknown> | undefined
    const extendsName = typeof testingContract?.["extends"] === "string"
      ? testingContract["extends"]
      : undefined

    if (!extendsName || !VALID_T1_TESTING_CONTRACTS.has(extendsName)) {
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

  console.log(`✓  ${paths.length} pattern contract${paths.length === 1 ? "" : "s"} valid.`)
  return 0
}

// ---------------------------------------------------------------------------
// ArchetypeSpec validation (ARD-T3-001)
//
// Required fields: kind, name, description, requiredPatterns, inputRoles,
//                  outputRoles, testPlan, visualGuidance, narrativeLabel
// Also: requiredPatterns must resolve to registered pattern names.
// ---------------------------------------------------------------------------

const ARCHETYPE_REQUIRED = [
  "kind",
  "name",
  "description",
  "requiredPatterns",
  "inputRoles",
  "outputRoles",
  "testPlan",
  "visualGuidance",
  "narrativeLabel",
] as const

export async function checkArchetypeSpecs(root: string): Promise<number> {
  const cwd = resolve(root)

  // Load registered pattern names for requiredPatterns resolution
  const patternPaths = await discoverFiles(cwd, ".pattern.yaml")
  const registeredPatterns = new Set<string>()
  for (const p of patternPaths) {
    try {
      const raw = (await readYaml(p)) as Record<string, unknown>
      if (typeof raw["name"] === "string") registeredPatterns.add(raw["name"])
    } catch { /* skip */ }
  }

  const allArchetypePaths = await discoverFiles(cwd, ".archetype.yaml")
  const specPaths = []
  for (const p of allArchetypePaths) {
    try {
      const raw = (await readYaml(p)) as Record<string, unknown>
      if (raw["kind"] === "ArchetypeSpec") specPaths.push({ p, raw })
    } catch { /* skip */ }
  }

  if (specPaths.length === 0) {
    console.log("No ArchetypeSpec files found.")
    return 0
  }

  const errors: string[] = []

  for (const { p, raw } of specPaths) {
    const missing = ARCHETYPE_REQUIRED.filter((f) => raw[f] === undefined || raw[f] === null)
    if (missing.length > 0) {
      errors.push(`  ${raw["name"] ?? p}: missing fields: ${missing.join(", ")}`)
    }

    const rp = raw["requiredPatterns"]
    if (Array.isArray(rp)) {
      for (const name of rp) {
        if (typeof name === "string" && !registeredPatterns.has(name)) {
          errors.push(`  ${raw["name"] ?? p}: requiredPatterns references unknown pattern "${name}"`)
        }
      }
    } else {
      errors.push(`  ${raw["name"] ?? p}: requiredPatterns must be an array`)
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
  const allPaths = await discoverFiles(cwd, ".archetype.yaml")
  const archetypeSpecs = new Map<string, Record<string, unknown>>()
  const instancePaths: Array<{ p: string; raw: Record<string, unknown> }> = []

  for (const p of allPaths) {
    try {
      const raw = (await readYaml(p)) as Record<string, unknown>
      if (raw["kind"] === "ArchetypeSpec" && typeof raw["name"] === "string") {
        archetypeSpecs.set(raw["name"], raw)
      } else if (raw["kind"] === "ArchetypeInstance") {
        instancePaths.push({ p, raw })
      }
    } catch { /* skip */ }
  }

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

  for (const { p, raw } of instancePaths) {
    const archetypeName = raw["archetype"] as string | undefined
    const label = `${archetypeName ?? "?"}@${raw["context"] ?? p}`

    // 1. Archetype name must resolve
    if (!archetypeName || !archetypeSpecs.has(archetypeName)) {
      errors.push(`  ${label}: archetype "${archetypeName}" not found in registered specs`)
      continue
    }

    const spec = archetypeSpecs.get(archetypeName)!
    const inputRoles = (spec["inputRoles"] as Array<{ name: string }> | undefined) ?? []
    const bindings = (raw["bindings"] as Array<{ role: string; event: string; from: string }> | undefined) ?? []
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
