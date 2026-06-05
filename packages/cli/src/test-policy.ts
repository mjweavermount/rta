import { Effect } from "effect"
import { resolve, join } from "node:path"
import { readdir, readFile } from "node:fs/promises"
import { readVocabFile } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"
import { GENERATED_HEADER } from "./generated-files.js"
import {
  deriveContextObligations,
  deriveConnectionsObligations,
  formatObligationMarker,
  type Obligation,
} from "./obligations.js"

// ---------------------------------------------------------------------------
// Test policy command
//
// Checks that every supported primitive obligation is represented by a
// CLI-generated test stub and visible in the test tree.
// ---------------------------------------------------------------------------

export interface TestPolicyOptions {
  root?: string
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const discoverVocabFiles = async (root: string): Promise<string[]> => {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === "dist") continue
        if (e.isDirectory()) await walk(join(dir, e.name))
        else if (
          e.name.endsWith(".context.yaml") ||
          e.name.endsWith(".connections.yaml")
        ) {
          results.push(join(dir, e.name))
        }
      }
    } catch { /* skip unreadable */ }
  }
  await walk(root)
  return results
}

const discoverTestFiles = async (root: string): Promise<string[]> => {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === "dist") continue
        if (e.isDirectory()) await walk(join(dir, e.name))
        else if (e.name.endsWith(".test.ts") || e.name.endsWith(".spec.ts")) {
          results.push(join(dir, e.name))
        }
      }
    } catch { /* skip unreadable */ }
  }
  await walk(root)
  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export const runTestPolicy = (opts: TestPolicyOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(opts.root ?? process.cwd())

    // Discover vocab files
    const vocabFiles = yield* Effect.promise(() => discoverVocabFiles(root))

    // Parse all vocab files
    const obligations: Obligation[] = []

    for (const file of vocabFiles) {
      const vocab = yield* readVocabFile(file).pipe(
        Effect.tapError((e) =>
          Effect.sync(() => console.warn(`  Warning: skipping ${file}: ${e.message}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (vocab === null) continue

      if (vocab.kind === "BoundedContext") {
        obligations.push(...deriveContextObligations(vocab))
      } else if (vocab.kind === "Connections") {
        obligations.push(...deriveConnectionsObligations(vocab))
      }
    }

    // Discover and concatenate test file contents
    const testFiles = yield* Effect.promise(() => discoverTestFiles(root))

    let testContent = ""
    let generatedTestContent = ""
    for (const file of testFiles) {
      const content = yield* Effect.tryPromise({
        try: () => readFile(file, "utf-8"),
        catch: () => null,
      }).pipe(
        Effect.tapError(() =>
          Effect.sync(() => console.warn(`  Warning: could not read ${file}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (content !== null) {
        testContent += content + "\n"
        if (GENERATED_HEADER.test(content)) {
          generatedTestContent += content + "\n"
        }
      }
    }

    const missingGeneratedObligations: Obligation[] = []
    const missingCoveredObligations: Obligation[] = []

    for (const obligation of obligations) {
      const marker = formatObligationMarker(obligation.id)
      if (!generatedTestContent.includes(marker)) {
        missingGeneratedObligations.push(obligation)
      }
      if (!testContent.includes(marker)) {
        missingCoveredObligations.push(obligation)
      }
    }

    const totalPrimitives = obligations.length
    const totalUntested =
      missingGeneratedObligations.length + missingCoveredObligations.length

    if (totalUntested === 0) {
      console.log(
        `✓  Testing policy: ${totalPrimitives}/${totalPrimitives} obligations generated and covered (${testFiles.length} test file${testFiles.length !== 1 ? "s" : ""})`,
      )
      return 0
    }

    console.error(`✗  Testing policy gaps:\n`)

    const padName = (name: string) => name.padEnd(56)

    if (missingGeneratedObligations.length > 0) {
      console.error(`  generated obligation stubs (missing CLI-owned marker):`)
      for (const obligation of missingGeneratedObligations) {
        const location = obligation.aggregate !== undefined
          ? `${obligation.context} / ${obligation.aggregate}`
          : obligation.context
        console.error(
          `    ${padName(obligation.id)}(${location})  ${obligation.description}`,
        )
      }
      console.error()
    }

    if (missingCoveredObligations.length > 0) {
      console.error(`  obligation coverage (missing @rta-obligation marker):`)
      for (const obligation of missingCoveredObligations) {
        const location = obligation.aggregate !== undefined
          ? `${obligation.context} / ${obligation.aggregate}`
          : obligation.context
        console.error(
          `    ${padName(obligation.id)}(${location})  ${obligation.description}`,
        )
      }
      console.error()
    }

    console.error(
      `${totalUntested} untested primitive${totalUntested !== 1 ? "s" : ""} → FAIL`,
    )

    return 1
  })
