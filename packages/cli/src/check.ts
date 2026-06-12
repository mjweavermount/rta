import { Effect } from "effect"
import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { formatArdEnforcementReport, validateArdEnforcement } from "./ard/enforcement.js"
import { formatArdMetaReport, validateArdMetadata } from "./ard/meta.js"
import { parseArdContent } from "./ard/schema.js"
import { runArds } from "./ard/runner.js"
import { formatReport, hasErrors } from "./ard/reporter.js"
import {
  checkPatternSpecs,
  checkPatternContracts,
  checkArchetypeSpecs,
  checkArchetypeBindings,
  checkTierContracts,
} from "./check-specs.js"
import {
  checkDecisionShapes,
  checkRuleShapes,
} from "./check-shapes.js"
import { checkObligationCoverage } from "./check-obligations.js"
import { checkOperationEvents } from "./check-operation-events.js"
import { checkPrimitiveBoundaries } from "./check-primitive-boundaries.js"
import { checkExecutionTelemetry } from "./check-telemetry.js"
import { checkTraceContext } from "./check-trace-context.js"
import { checkGeneratedSync } from "./generated-sync.js"
import { isGoldenFixturePath } from "./discovery.js"
import { runPureTsCheck } from "./check-pure-ts.js"
import { runReleaseHygieneCheck } from "./check-release-hygiene.js"
import { runWorkLedgerCheck } from "./check-work-ledger.js"
import { runCoverageWaiverCheck } from "./check-coverage-waivers.js"
import { checkBoundarySanitization } from "./check-boundary-sanitization.js"
import { checkBrandBloom } from "./check-brand-bloom.js"
import { checkDeploymentContract } from "./check-deployment-contract.js"
import { checkAppWiring } from "./app-wiring.js"

// ---------------------------------------------------------------------------
// Discover ARD files under a root directory.
// ---------------------------------------------------------------------------

const discoverArdFiles = (
  root: string,
  options: { readonly includeJson?: boolean } = {},
): Effect.Effect<ReadonlyArray<string>> =>
  Effect.promise(async () => {
    try {
      const entries = await readdir(root, { recursive: true })
      return entries
        .filter((e) =>
          (e.endsWith(".ard.yaml") || (options.includeJson === true && e.endsWith(".ard.json"))) &&
          !e.includes("node_modules")
        )
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
  readonly ardEnforcement?: boolean
  readonly patternSpecs?: boolean
  readonly patternContracts?: boolean
  readonly archetypeSpecs?: boolean
  readonly archetypeBindings?: boolean
  readonly tierContracts?: boolean
  readonly generatedSync?: boolean
  readonly decisionShapes?: boolean
  readonly ruleShapes?: boolean
  readonly obligationCoverage?: boolean
  readonly executionTelemetry?: boolean
  readonly operationEvent?: boolean
  readonly primitiveBoundaries?: boolean
  readonly traceContext?: boolean
  readonly production?: boolean
  readonly telemetrySync?: boolean
  readonly pureTs?: boolean
  readonly releaseHygiene?: boolean
  readonly workLedger?: boolean
  readonly demoCoverage?: boolean
  readonly coverageWaivers?: boolean
  readonly boundarySanitization?: boolean
  readonly brandBloom?: boolean
  readonly deploymentContract?: boolean
  readonly appWiring?: boolean
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
    if (options.tierContracts) {
      return yield* Effect.promise(() => checkTierContracts(cwd))
    }
    if (options.generatedSync) {
      return yield* Effect.promise(() => checkGeneratedSync(cwd))
    }
    if (options.telemetrySync) {
      return yield* Effect.promise(() => checkGeneratedSync(cwd))
    }
    if (options.pureTs) {
      return yield* runPureTsCheck(cwd).pipe(
        Effect.catchAll((cause) =>
          Effect.sync(() => {
            console.error("pure-ts check failed:")
            console.error(cause)
            return 1
          }),
        ),
      )
    }
    if (options.releaseHygiene) {
      return yield* runReleaseHygieneCheck(cwd)
    }
    if (options.workLedger || options.demoCoverage) {
      return yield* runWorkLedgerCheck(cwd)
    }
    if (options.coverageWaivers) {
      return yield* runCoverageWaiverCheck(cwd)
    }
    if (options.boundarySanitization) {
      return yield* Effect.promise(() => checkBoundarySanitization(cwd))
    }
    if (options.brandBloom) {
      return yield* Effect.promise(() => checkBrandBloom(cwd))
    }
    if (options.deploymentContract) {
      return yield* Effect.promise(() => checkDeploymentContract(cwd))
    }
    if (options.appWiring) {
      return yield* Effect.promise(() => checkAppWiring(cwd))
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
    if (options.traceContext) {
      return yield* Effect.promise(() => checkTraceContext(cwd))
    }
    if (options.production) {
      const productionArdPaths = yield* discoverArdFiles(cwd, { includeJson: true })
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
        ["ard-enforcement", () => Effect.sync(() => {
          const enforcementIssues = validateArdEnforcement(productionArds)
          if (enforcementIssues.length > 0) {
            console.error(formatArdEnforcementReport(enforcementIssues))
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
        ["trace-context", () => Effect.promise(() => checkTraceContext(cwd))],
        ["boundary-sanitization", () => Effect.promise(() => checkBoundarySanitization(cwd))],
        ["brand-bloom", () => Effect.promise(() => checkBrandBloom(cwd))],
        ["deployment-contract", () => Effect.promise(() => checkDeploymentContract(cwd))],
        ["app-wiring", () => Effect.promise(() => checkAppWiring(cwd))],
        ["tier-contracts", () => Effect.promise(() => checkTierContracts(cwd))],
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

    const paths = yield* discoverArdFiles(cwd, { includeJson: options.ardMeta === true || options.ardEnforcement === true })

    if (paths.length === 0) {
      console.log("No *.ard.yaml or *.ard.json files found.")
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

    if (options.ardEnforcement) {
      const enforcementIssues = validateArdEnforcement(ards)
      if (enforcementIssues.length > 0) {
        console.error(formatArdEnforcementReport(enforcementIssues))
        return 1
      }
      console.log(formatArdEnforcementReport([]))
      return 0
    }

    const results = yield* runArds(ards, cwd)
    console.log(formatReport(results))

    return hasErrors(results) ? 1 : 0
  })
