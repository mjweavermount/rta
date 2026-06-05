import { Effect } from "effect"
import { readdir, mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { readVocabFile } from "@rta/vocab"
import type { BoundedContextDeclaration, ConnectionsDeclaration } from "@rta/vocab"
import { generateContext } from "./generate/context-generator.js"
import { generateObligationTests } from "./generate/obligation-generator.js"
import { generateOperationEventTests } from "./generate/operation-event-generator.js"
import { generateTelemetryTests } from "./generate/telemetry-generator.js"
import { generateRegistry } from "./generate/registry-generator.js"
import { generateRoutes, collectManifestEntries, type ManifestEntry } from "./generate/route-generator.js"

function generateManifestFile(entries: ManifestEntry[]): string {
  const rows = entries.map((e) =>
    `  { operation: ${JSON.stringify(e.operation)}, kind: ${JSON.stringify(e.kind)}, context: ${JSON.stringify(e.context)}, method: ${JSON.stringify(e.method)}, path: ${JSON.stringify(e.path)}, pathParams: ${JSON.stringify(e.pathParams)} },`
  ).join("\n")
  return [
    `export interface RouteManifestEntry {`,
    `  operation: string`,
    `  kind: "command" | "query"`,
    `  context: string`,
    `  method: string`,
    `  path: string`,
    `  pathParams: string[]`,
    `}`,
    ``,
    `export const routeManifest: RouteManifestEntry[] = [`,
    rows,
    `]`,
    ``,
  ].join("\n")
}
import { isGoldenFixturePath } from "./discovery.js"
import { computeVocabHash, formatGeneratedHeader } from "./generated-files.js"

// ---------------------------------------------------------------------------
// Discover files by suffix
// ---------------------------------------------------------------------------

const discoverFiles = (
  root: string,
  suffix: string,
): Effect.Effect<ReadonlyArray<string>> =>
  Effect.promise(async () => {
    try {
      const entries = await readdir(root, { recursive: true })
      return entries
        .filter((e) => e.endsWith(suffix) && !e.includes("node_modules"))
        .filter((e) => !isGoldenFixturePath(e))
        .map((e) => join(root, e))
    } catch {
      return [] as string[]
    }
  })

// ---------------------------------------------------------------------------
// generate command
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  readonly root?: string
  readonly outDir?: string
  readonly strict?: boolean
  /** Skip files that already exist (never skip registry.ts) */
  readonly skipExisting?: boolean
}

export const runGenerate = (
  options: GenerateOptions = {},
): Effect.Effect<number> =>
  Effect.gen(function* () {
    const cwd = resolve(options.root ?? process.cwd())
    const outDir = resolve(options.outDir ?? join(cwd, "generated"))
    const strict = options.strict ?? false
    const skipExisting = options.skipExisting ?? false

    const contextPaths = yield* discoverFiles(cwd, ".context.yaml")
    const connectionPaths = yield* discoverFiles(cwd, ".connections.yaml")
    const vocabHash = yield* Effect.tryPromise({
      try: () => computeVocabHash(cwd),
      catch: (cause) => new Error(String(cause)),
    }).pipe(Effect.orDie)

    if (contextPaths.length === 0) {
      console.log("No *.context.yaml files found.")
      return 0
    }

    // Parse all contexts
    const allContexts: BoundedContextDeclaration[] = []

    for (const path of contextPaths) {
      const vocabFile = yield* readVocabFile(path).pipe(
        Effect.tapError((e) =>
          Effect.sync(() => console.error(`  Warning: ${e.message}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )

      if (!vocabFile || vocabFile.kind !== "BoundedContext") continue

      allContexts.push(vocabFile)
    }

    // Parse all connections files
    const allConnections: ConnectionsDeclaration[] = []

    for (const path of connectionPaths) {
      const vocabFile = yield* readVocabFile(path).pipe(
        Effect.tapError((e) =>
          Effect.sync(() => console.error(`  Warning (connections): ${e.message}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )

      if (!vocabFile || vocabFile.kind !== "Connections") continue

      allConnections.push(vocabFile)
    }

    // Generate per-context files
    const allManifestEntries: ManifestEntry[] = []

    for (const ctx of allContexts) {
      const contextOutDir = join(outDir, ctx.name)
      const connections = allConnections.find((candidate) => candidate.context === ctx.name)

      yield* Effect.tryPromise({
        try: () => mkdir(contextOutDir, { recursive: true }),
        catch: (cause) => new Error(String(cause)),
      }).pipe(Effect.orDie)

      const files = [
        ...generateContext(ctx, { strict, ...(connections ? { connections } : {}) }),
        ...generateRoutes(ctx),
      ]

      for (const file of files) {
        const filePath = join(contextOutDir, file.filename)
        const fileExists = existsSync(filePath)
        if (fileExists && (skipExisting || !file.overwriteExisting)) {
          console.log(`  Preserved: ${filePath}`)
          continue
        }
        yield* Effect.tryPromise({
          try: () => writeFile(filePath, `${formatGeneratedHeader(vocabHash)}\n${file.content}`, "utf-8"),
          catch: (cause) => new Error(String(cause)),
        }).pipe(Effect.orDie)
        console.log(`  Generated: ${filePath}`)
      }

      allManifestEntries.push(...collectManifestEntries(ctx))
    }

    // Generate registry.ts at outDir root
    yield* Effect.tryPromise({
      try: () => mkdir(outDir, { recursive: true }),
      catch: (cause) => new Error(String(cause)),
    }).pipe(Effect.orDie)

    const registryContent = generateRegistry(allContexts, allConnections, { strict })
    const registryPath = join(outDir, "registry.ts")
    yield* Effect.tryPromise({
      try: () => writeFile(registryPath, `${formatGeneratedHeader(vocabHash)}\n${registryContent}`, "utf-8"),
      catch: (cause) => new Error(String(cause)),
    }).pipe(Effect.orDie)
    console.log(`  Generated: ${registryPath}`)

    // Generate manifest.ts — route manifest for Console and API endpoint
    if (allManifestEntries.length > 0) {
      const manifestContent = generateManifestFile(allManifestEntries)
      const manifestPath = join(outDir, "manifest.ts")
      yield* Effect.tryPromise({
        try: () => writeFile(manifestPath, `${formatGeneratedHeader(vocabHash)}\n${manifestContent}`, "utf-8"),
        catch: (cause) => new Error(String(cause)),
      }).pipe(Effect.orDie)
      console.log(`  Generated: ${manifestPath}`)
    }

    const generatedTestsRoot = join(cwd, "generated-tests")
    yield* Effect.tryPromise({
      try: () => mkdir(generatedTestsRoot, { recursive: true }),
      catch: (cause) => new Error(String(cause)),
    }).pipe(Effect.orDie)

    const obligationTestFiles = generateObligationTests(
      allContexts,
      allConnections,
      vocabHash,
    )
    const telemetryTestFiles = generateTelemetryTests(
      allContexts,
      allConnections,
      vocabHash,
    )
    const operationEventTestFiles = generateOperationEventTests(
      allContexts,
      allConnections,
      vocabHash,
    )

    for (const file of [...obligationTestFiles, ...telemetryTestFiles, ...operationEventTestFiles]) {
      const filePath = join(generatedTestsRoot, file.relativePath)
      yield* Effect.tryPromise({
        try: async () => {
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, file.content, "utf-8")
        },
        catch: (cause) => new Error(String(cause)),
      }).pipe(Effect.orDie)
      console.log(`  Generated: ${filePath}`)
    }

    return 0
  })
