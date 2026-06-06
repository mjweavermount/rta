import { Effect } from "effect"
import { runCheck } from "../src/check.js"
import { runGenerate } from "../src/generate.js"
import { runContext } from "../src/context.js"
import { runInit } from "../src/init.js"
import { runServe } from "../src/serve.js"
import { runLint } from "../src/lint.js"
import { runCoverage } from "../src/coverage.js"
import { runTestPolicy } from "../src/test-policy.js"
import { generateAppScaffold } from "../src/app-scaffold.js"
import { CHECK_MODES, COVERAGE_KINDS } from "../src/cli-inventory.js"

// ---------------------------------------------------------------------------
// Minimal arg parser (no deps beyond Effect)
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const command = args[0]

const hasFlag = (flag: string) => args.includes(flag)
const flagValue = (flag: string): string | undefined => {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}
const flagValues = (flag: string): string[] => {
  const results: string[] = []
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === flag) results.push(args[i + 1]!)
  }
  return results
}

// exactOptionalPropertyTypes: only include optional keys when they have a value
const withRoot = (v: string | undefined) =>
  v !== undefined ? { root: v } : {}
const wantsHelp = command === "--help" || command === "-h" || hasFlag("--help") || hasFlag("-h")
const allowedCheckFlags = new Set<string>(["--root", ...CHECK_MODES.map((mode) => `--${mode}`)])

const rejectUnknownFlags = (
  scope: string,
  allowed: ReadonlySet<string>,
): number | null => {
  for (const arg of args.slice(1)) {
    if (arg.startsWith("--") && !allowed.has(arg)) {
      console.error(`${scope}: unknown flag ${arg}`)
      return 1
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const main = Effect.gen(function* () {
  switch (command) {
    case "init": {
      const exitCode = yield* runInit({
        ...withRoot(flagValue("--root")),
        force: hasFlag("--force"),
      })
      process.exit(exitCode)
      break
    }
    case "context": {
      const exitCode = yield* runContext(withRoot(flagValue("--root")))
      process.exit(exitCode)
      break
    }
    case "check": {
      const unknownFlag = rejectUnknownFlags("rta check", allowedCheckFlags)
      if (unknownFlag !== null) {
        process.exit(unknownFlag)
        break
      }
      const exitCode = yield* runCheck({
        ...withRoot(flagValue("--root")),
        ...(hasFlag("--ard-meta")          ? { ardMeta: true }          : {}),
        ...(hasFlag("--ard-enforcement")   ? { ardEnforcement: true }   : {}),
        ...(hasFlag("--pattern-specs")      ? { patternSpecs: true }      : {}),
        ...(hasFlag("--pattern-contracts")  ? { patternContracts: true }  : {}),
        ...(hasFlag("--archetype-specs")    ? { archetypeSpecs: true }    : {}),
        ...(hasFlag("--archetype-bindings") ? { archetypeBindings: true } : {}),
        ...(hasFlag("--generated-sync")     ? { generatedSync: true }     : {}),
        ...(hasFlag("--decision-shapes")    ? { decisionShapes: true }    : {}),
        ...(hasFlag("--rule-shapes")        ? { ruleShapes: true }        : {}),
        ...(hasFlag("--obligation-coverage") ? { obligationCoverage: true } : {}),
        ...(hasFlag("--execution-telemetry") ? { executionTelemetry: true } : {}),
        ...(hasFlag("--operation-event") ? { operationEvent: true } : {}),
        ...(hasFlag("--primitive-boundaries") ? { primitiveBoundaries: true } : {}),
        ...(hasFlag("--trace-context") ? { traceContext: true } : {}),
        ...(hasFlag("--production") ? { production: true } : {}),
        ...(hasFlag("--telemetry-sync") ? { telemetrySync: true } : {}),
        ...(hasFlag("--pure-ts") ? { pureTs: true } : {}),
        ...(hasFlag("--release-hygiene") ? { releaseHygiene: true } : {}),
        ...(hasFlag("--work-ledger") ? { workLedger: true } : {}),
        ...(hasFlag("--demo-coverage") ? { demoCoverage: true } : {}),
        ...(hasFlag("--coverage-waivers") ? { coverageWaivers: true } : {}),
        ...(hasFlag("--boundary-sanitization") ? { boundarySanitization: true } : {}),
        ...(hasFlag("--brand-bloom") ? { brandBloom: true } : {}),
      })
      process.exit(exitCode)
      break
    }
    case "generate": {
      if (args[1] === "app") {
        const name = flagValue("--name") ?? args[2] ?? "rta-app"
        const out = flagValue("--out") ?? name
        const target = yield* generateAppScaffold({ name, outDir: out })
        console.log(`Generated app scaffold: ${target}`)
        process.exit(0)
        break
      }
      const outDir = flagValue("--out")
      const exitCode = yield* runGenerate({
        ...withRoot(flagValue("--root")),
        ...(outDir !== undefined ? { outDir } : {}),
        strict: hasFlag("--strict"),
      })
      process.exit(exitCode)
      break
    }
    case "lint": {
      const exitCode = yield* runLint(withRoot(flagValue("--root")))
      process.exit(exitCode)
      break
    }
    case "coverage": {
      const kindRaw = flagValue("--kind")
      type CoverageKind = (typeof COVERAGE_KINDS)[number]
      if (!kindRaw || !(COVERAGE_KINDS as readonly string[]).includes(kindRaw)) {
        console.error(`rta coverage: --kind must be one of: ${COVERAGE_KINDS.join(", ")}`)
        process.exit(1)
        break
      }
      const exitCode = yield* runCoverage({
        ...withRoot(flagValue("--root")),
        kind: kindRaw as CoverageKind,
      })
      process.exit(exitCode)
      break
    }
    case "test-policy": {
      const exitCode = yield* runTestPolicy(withRoot(flagValue("--root")))
      process.exit(exitCode)
      break
    }
    case "serve": {
      const portStr = flagValue("--port")
      const roots = flagValues("--root")
      const exitCode = yield* runServe({
        ...(roots.length === 1 ? withRoot(roots[0]) : roots.length > 1 ? { roots } : {}),
        ...(portStr !== undefined ? { port: parseInt(portStr, 10) } : {}),
      })
      process.exit(exitCode)
      break
    }
    default: {
      console.log(`
Ṛta CLI

Usage:
  rta init              Scaffold a new project (vocab skeleton + AGENTS.md)
  rta context           Show all defined contexts, aggregates, events, and connections
  rta check             Run all *.ard.yaml architectural checks
  rta generate          Scaffold TypeScript from *.context.yaml vocab files
  rta generate app      Scaffold a new RTA app shell
  rta lint              Check all *.context.yaml files for missing descriptions
  rta coverage          Check bidirectional coverage between vocab declarations and source implementations
  rta test-policy       Check that every declared primitive has at least one test mention
  rta serve             Start the visualizer pointed at this project

Options:
  --root <dir>          Root directory to search (default: cwd)
  --port <number>       Port for rta serve (default: 5173)
  --force               Overwrite existing files (init only)
  --out <dir>           Output directory for generated files (generate only)
  --name <name>         App name (generate app only)
  --strict              Use @rta/strict factories instead of @rta/core (generate only)
  --kind <kind>         Coverage kind: ${COVERAGE_KINDS.join(" | ")} (coverage only)
  --ard-meta            Validate ARD spirit/letter metadata (check only)
  --ard-enforcement     Validate accepted ARDs declare enforcement (check only)
  --pattern-specs       Validate PatternSpec YAML structure (check only)
  --pattern-contracts   Validate PatternSpec testing contracts (check only)
  --archetype-specs     Validate ArchetypeSpec YAML structure (check only)
  --archetype-bindings  Validate ArchetypeInstance bindings (check only)
  --generated-sync      Validate generated file vocab-hash headers (check only)
  --decision-shapes     Validate decision implementation-shape coverage (check only)
  --rule-shapes         Validate rule implementation-shape coverage (check only)
  --obligation-coverage Validate rule/decision obligation markers in tests (check only)
  --execution-telemetry Validate execution-telemetry markers in tests (check only)
  --operation-event    Validate readable operation-event contract markers in tests (check only)
  --primitive-boundaries Validate app source exports go through RTA primitives (check only)
  --trace-context      Validate canonical execution IDs across scope, messages, primitives, and projections
  --production          Run production-readiness checks as one aggregate gate (check only)
  --telemetry-sync      Validate generated telemetry stub headers (check only)
  --pure-ts             Fail on tracked JS/MJS/CJS source outside the migration allowlist
  --release-hygiene     Validate package, CI, audit, and release metadata
  --work-ledger         Validate work ledger cards and QA shape
  --demo-coverage       Validate work ledger cards are tied to demo coverage
  --coverage-waivers    Validate 100% authored-code coverage or explicit waivers
  --boundary-sanitization Validate boundary schemas and adapter promotion pipelines
  --brand-bloom         Validate branded vocab manifest and adapter fittings
`)
      process.exit(command && !wantsHelp ? 1 : 0)
    }
  }
})

Effect.runPromise(main).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
