import { Effect } from "effect"
import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { formatArdMetaReport, validateArdMetadata } from "./ard/meta.js"
import { parseArdContent } from "./ard/schema.js"
import { runArds } from "./ard/runner.js"
import { formatReport, hasErrors } from "./ard/reporter.js"
import {
  checkPatternSpecs,
  checkPatternContracts,
  checkArchetypeSpecs,
  checkArchetypeBindings,
} from "./check-specs.js"
import {
  checkDecisionShapes,
  checkRuleShapes,
} from "./check-shapes.js"
import { checkObligationCoverage } from "./check-obligations.js"
import { checkOperationEvents } from "./check-operation-events.js"
import { checkPrimitiveBoundaries } from "./check-primitive-boundaries.js"
import { checkExecutionTelemetry } from "./check-telemetry.js"
import { checkGeneratedSync } from "./generated-sync.js"
import { isGoldenFixturePath } from "./discovery.js"

// ---------------------------------------------------------------------------
// Discover *.ard.yaml files under a root directory (non-recursive for v1)
// ---------------------------------------------------------------------------

const discoverArdFiles = (root: string): Effect.Effect<ReadonlyArray<string>> =>
  Effect.promise(async () => {
    try {
      const entries = await readdir(root, { recursive: true })
      return entries
        .filter((e) => e.endsWith(".ard.yaml") && !e.includes("node_modules"))
        .filter((e) => !isGoldenFixturePath(e))
        .map((e) => join(root, e))
    } catch {
      return [] as string[]
    }
  })

// ---------------------------------------------------------------------------
// Load and parse all ARD files
// ---------------------------------------------------------------------------

const loadArds = (paths: ReadonlyArray<string>) =>
  Effect.forEach(paths, (p) =>
    Effect.tryPromise({
      try: () => readFile(p, "utf-8"),
      catch: (cause) => ({ _tag: "ReadError" as const, path: p, cause }),
    }).pipe(
      Effect.flatMap((content) => parseArdContent(content, p)),
      Effect.tapError((e) =>
        Effect.sync(() =>
          console.error(
            `  Warning: ${e._tag === "ArdParseError" ? e.message : String(e)}`,
          ),
        ),
      ),
      Effect.option,
    ),
  ).pipe(
    Effect.map((opts) =>
      opts.flatMap((o) => (o._tag === "Some" ? [o.value] : [])),
    ),
  )

// ---------------------------------------------------------------------------
// check command
// ---------------------------------------------------------------------------

export interface CheckOptions {
  readonly root?: string
  readonly ardMeta?: boolean
  readonly patternSpecs?: boolean
  readonly patternContracts?: boolean
  readonly archetypeSpecs?: boolean
  readonly archetypeBindings?: boolean
  readonly generatedSync?: boolean
  readonly decisionShapes?: boolean
  readonly ruleShapes?: boolean
  readonly obligationCoverage?: boolean
  readonly executionTelemetry?: boolean
  readonly operationEvent?: boolean
  readonly primitiveBoundaries?: boolean
  readonly production?: boolean
  readonly telemetrySync?: boolean
}

export const runCheck = (options: CheckOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const cwd = resolve(options.root ?? process.cwd())

    if (options.patternSpecs) {
      return yield* Effect.promise(() => checkPatternSpecs(cwd))
    }
    if (options.patternContracts) {
      return yield* Effect.promise(() => checkPatternContracts(cwd))
    }
    if (options.archetypeSpecs) {
      return yield* Effect.promise(() => checkArchetypeSpecs(cwd))
    }
    if (options.archetypeBindings) {
      return yield* Effect.promise(() => checkArchetypeBindings(cwd))
    }
    if (options.generatedSync) {
      return yield* Effect.promise(() => checkGeneratedSync(cwd))
    }
    if (options.telemetrySync) {
      return yield* Effect.promise(() => checkGeneratedSync(cwd))
    }
    if (options.decisionShapes) {
      return yield* Effect.promise(() => checkDecisionShapes(cwd))
    }
    if (options.ruleShapes) {
      return yield* Effect.promise(() => checkRuleShapes(cwd))
    }
    if (options.obligationCoverage) {
      return yield* Effect.promise(() => checkObligationCoverage(cwd))
    }
    if (options.executionTelemetry) {
      return yield* Effect.promise(() => checkExecutionTelemetry(cwd))
    }
    if (options.operationEvent) {
      return yield* Effect.promise(() => checkOperationEvents(cwd))
    }
    if (options.primitiveBoundaries) {
      return yield* Effect.promise(() => checkPrimitiveBoundaries(cwd))
    }
    if (options.production) {
      const productionArdPaths = yield* discoverArdFiles(cwd)
      const productionArds = yield* loadArds(productionArdPaths)
      if (productionArds.length === 0) {
        console.error("production check failed: no valid ARDs found")
        return 1
      }
      const checks = [
        ["ard-meta", () => Effect.sync(() => {
          const metaIssues = validateArdMetadata(productionArds)
          if (metaIssues.length > 0) {
            console.error(formatArdMetaReport(metaIssues))
            return 1
          }
          return 0
        })],
        ["generated-sync", () => Effect.promise(() => checkGeneratedSync(cwd))],
        ["decision-shapes", () => Effect.promise(() => checkDecisionShapes(cwd))],
        ["rule-shapes", () => Effect.promise(() => checkRuleShapes(cwd))],
        ["obligation-coverage", () => Effect.promise(() => checkObligationCoverage(cwd))],
        ["execution-telemetry", () => Effect.promise(() => checkExecutionTelemetry(cwd))],
        ["operation-event", () => Effect.promise(() => checkOperationEvents(cwd))],
        ["primitive-boundaries", () => Effect.promise(() => checkPrimitiveBoundaries(cwd))],
        ["pattern-specs", () => Effect.promise(() => checkPatternSpecs(cwd))],
        ["pattern-contracts", () => Effect.promise(() => checkPatternContracts(cwd))],
        ["archetype-specs", () => Effect.promise(() => checkArchetypeSpecs(cwd))],
        ["archetype-bindings", () => Effect.promise(() => checkArchetypeBindings(cwd))],
      ] as const
      let failed = 0
      for (const [label, run] of checks) {
        const code = yield* run()
        if (code !== 0) {
          failed += 1
          console.error(`production check failed: ${label}`)
        }
      }
      if (failed === 0) {
        console.log("✓  Production check passed.")
        return 0
      }
      console.error(`${failed} production check${failed === 1 ? "" : "s"} failed → FAIL`)
      return 1
    }

    const paths = yield* discoverArdFiles(cwd)

    if (paths.length === 0) {
      console.log("No *.ard.yaml files found.")
      return 0
    }

    const ards = yield* loadArds(paths)

    if (ards.length === 0) {
      console.log("No valid ARD files could be parsed.")
      return 1
    }

    const metaIssues = validateArdMetadata(ards)
    if (metaIssues.length > 0) {
      console.error(formatArdMetaReport(metaIssues))
      return 1
    }

    if (options.ardMeta) {
      console.log(formatArdMetaReport([]))
      return 0
    }

    const results = yield* runArds(ards, cwd)
    console.log(formatReport(results))

    return hasErrors(results) ? 1 : 0
  })
