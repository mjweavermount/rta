import { Effect } from "effect"
import { resolve, join, basename, extname } from "node:path"
import { readdir, readFile } from "node:fs/promises"
import { readVocabFile, type VocabFile } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

// ---------------------------------------------------------------------------
// Coverage command
//
// Performs a bidirectional diff between:
//   declared — primitives defined in *.context.yaml / *.connections.yaml
//   implemented — names found via regex in *.ts source files
//
// Kinds: rules | decisions | reactions | pm
// ---------------------------------------------------------------------------

export interface CoverageOptions {
  root?: string
  kind: "rules" | "decisions" | "reactions" | "pm"
}

interface DeclaredPrimitive {
  name: string
  context: string
  aggregate?: string
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const discoverVocabFiles = async (root: string): Promise<{ context: string[]; connections: string[] }> => {
  const context: string[] = []
  const connections: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === "dist") continue
        if (e.isDirectory()) await walk(join(dir, e.name))
        else if (e.name.endsWith(".context.yaml")) context.push(join(dir, e.name))
        else if (e.name.endsWith(".connections.yaml")) connections.push(join(dir, e.name))
      }
    } catch { /* skip unreadable */ }
  }
  await walk(root)
  return { context, connections }
}

const discoverSourceFiles = async (root: string): Promise<string[]> => {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === "dist") continue
        if (e.isDirectory()) await walk(join(dir, e.name))
        else if (
          e.name.endsWith(".ts") &&
          !e.name.endsWith(".test.ts") &&
          !e.name.endsWith(".spec.ts")
        ) {
          results.push(join(dir, e.name))
        }
      }
    } catch { /* skip unreadable */ }
  }
  await walk(root)
  return results
}

// ---------------------------------------------------------------------------
// Declared primitive extraction
// ---------------------------------------------------------------------------

const collectDeclaredRules = (parsed: Map<string, VocabFile>): DeclaredPrimitive[] => {
  const declared: DeclaredPrimitive[] = []
  for (const [, vocab] of parsed) {
    if (vocab.kind !== "BoundedContext") continue
    for (const agg of vocab.aggregates ?? []) {
      for (const rule of agg.rules ?? []) {
        declared.push({ name: rule.name, context: vocab.name, aggregate: agg.name })
      }
    }
  }
  return declared
}

const collectDeclaredDecisions = (parsed: Map<string, VocabFile>): DeclaredPrimitive[] => {
  const declared: DeclaredPrimitive[] = []
  for (const [, vocab] of parsed) {
    if (vocab.kind !== "BoundedContext") continue
    for (const dec of vocab.decisions ?? []) {
      declared.push({ name: dec.name, context: vocab.name })
    }
  }
  return declared
}

const collectDeclaredReactions = (parsed: Map<string, VocabFile>): DeclaredPrimitive[] => {
  const declared: DeclaredPrimitive[] = []
  for (const [, vocab] of parsed) {
    if (vocab.kind !== "Connections") continue
    for (const reaction of vocab.reactions ?? []) {
      declared.push({ name: reaction.name, context: vocab.context })
    }
  }
  return declared
}

const collectDeclaredPMs = (parsed: Map<string, VocabFile>): DeclaredPrimitive[] => {
  const declared: DeclaredPrimitive[] = []
  for (const [, vocab] of parsed) {
    if (vocab.kind !== "BoundedContext") continue
    for (const pm of vocab.processManagers ?? []) {
      declared.push({ name: pm.name, context: vocab.name })
    }
  }
  return declared
}

// ---------------------------------------------------------------------------
// Implemented name extraction via regex
// ---------------------------------------------------------------------------

const extractByRegex = (source: string, pattern: RegExp): Set<string> => {
  const found = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1]
    if (name !== undefined) found.add(name)
  }
  return found
}

const collectImplementedRules = (sources: Map<string, string>): Set<string> => {
  const pattern = /makeRule\(\s*["']([^"']+)["']/g
  const found = new Set<string>()
  for (const [, content] of sources) {
    for (const name of extractByRegex(content, pattern)) found.add(name)
  }
  return found
}

const collectImplementedDecisions = (sources: Map<string, string>): Set<string> => {
  const pattern = /makeDecision[^(]*\(\s*["']([^"']+)["']/g
  const found = new Set<string>()
  for (const [, content] of sources) {
    for (const name of extractByRegex(content, pattern)) found.add(name)
  }
  return found
}

const collectImplementedReactions = (sources: Map<string, string>): Set<string> => {
  const pattern = /makeReaction[^(]*\(\s*["']([^"']+)["']/g
  const found = new Set<string>()
  for (const [, content] of sources) {
    for (const name of extractByRegex(content, pattern)) found.add(name)
  }
  return found
}

const collectImplementedPMs = (sources: Map<string, string>): Set<string> => {
  const found = new Set<string>()
  for (const [filePath, content] of sources) {
    if (!content.includes("makeProcessManager")) continue
    if (!content.includes("@rta/core")) continue
    const name = basename(filePath, extname(filePath))
    found.add(name)
  }
  return found
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const padName = (name: string) => name.padEnd(40)

const formatDeclaredLocation = (p: DeclaredPrimitive): string =>
  p.aggregate !== undefined ? `(${p.context} / ${p.aggregate})` : `(${p.context})`

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export const runCoverage = (opts: CoverageOptions): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(opts.root ?? process.cwd())

    // Discover files
    const { context: contextFiles, connections: connFiles } = yield* Effect.promise(() =>
      discoverVocabFiles(root),
    )
    const sourceFiles = yield* Effect.promise(() => discoverSourceFiles(root))

    // Parse all vocab files into a single map
    const parsed = new Map<string, VocabFile>()

    for (const file of [...contextFiles, ...connFiles]) {
      const vocab = yield* readVocabFile(file).pipe(
        Effect.tapError((e) =>
          Effect.sync(() => console.warn(`  Warning: skipping ${file}: ${e.message}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (vocab !== null) parsed.set(file, vocab)
    }

    // Read source files
    const sources = new Map<string, string>()
    for (const file of sourceFiles) {
      const content = yield* Effect.tryPromise({
        try: () => readFile(file, "utf-8"),
        catch: () => null,
      }).pipe(
        Effect.tapError(() =>
          Effect.sync(() => console.warn(`  Warning: could not read ${file}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (content !== null) sources.set(file, content)
    }

    // Collect declared and implemented based on kind
    let declared: DeclaredPrimitive[]
    let implemented: Set<string>

    switch (opts.kind) {
      case "rules":
        declared = collectDeclaredRules(parsed)
        implemented = collectImplementedRules(sources)
        break
      case "decisions":
        declared = collectDeclaredDecisions(parsed)
        implemented = collectImplementedDecisions(sources)
        break
      case "reactions":
        declared = collectDeclaredReactions(parsed)
        implemented = collectImplementedReactions(sources)
        break
      case "pm":
        declared = collectDeclaredPMs(parsed)
        implemented = collectImplementedPMs(sources)
        break
    }

    const declaredNames = new Set(declared.map((d) => d.name))
    const missing = declared.filter((d) => !implemented.has(d.name))
    const orphans =
      opts.kind !== "pm"
        ? [...implemented].filter((name) => !declaredNames.has(name))
        : []

    const kindLabel: Record<CoverageOptions["kind"], string> = {
      rules: "Rule",
      decisions: "Decision",
      reactions: "Reaction",
      pm: "Process manager",
    }

    const label = kindLabel[opts.kind]
    const contextCount = new Set([...declared.map((d) => d.context)]).size

    if (missing.length === 0 && orphans.length === 0) {
      console.log(
        `✓  ${label} coverage: ${declared.length}/${declared.length} ${opts.kind} matched (${contextCount} context${contextCount !== 1 ? "s" : ""})`,
      )
      return 0
    }

    console.error(`✗  ${label} coverage gaps found:\n`)

    if (missing.length > 0) {
      console.error(`  declared but not implemented:`)
      for (const p of missing) {
        console.error(`    ${padName(p.name)}${formatDeclaredLocation(p)}`)
      }
      console.error()
    }

    if (orphans.length > 0) {
      console.error(`  implemented but not declared in vocab (orphans):`)
      for (const name of orphans) {
        console.error(`    ${name}`)
      }
      console.error()
    }

    const parts: string[] = []
    if (missing.length > 0) parts.push(`${missing.length} gap${missing.length !== 1 ? "s" : ""}`)
    if (orphans.length > 0)
      parts.push(`${orphans.length} orphan${orphans.length !== 1 ? "s" : ""}`)

    console.error(`${parts.join(", ")} → FAIL`)

    return 1
  })
