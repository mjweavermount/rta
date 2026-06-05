import { Effect } from "effect"
import { resolve, join } from "node:path"
import { readdir } from "node:fs/promises"
import { readVocabFile } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

// ---------------------------------------------------------------------------
// Vocab description linter
//
// Checks that every DDD primitive in every *.context.yaml file has the
// natural-language metadata required by the team's architectural standards:
//
//   description   — what this thing IS (all primitives)
//   guidance      — when to reach for it / agent strategies
//                   (BoundedContext, Aggregate, Command, Event, Query)
//
// The ARD enforces this as a hard gate; this command reports the violations.
// ---------------------------------------------------------------------------

export interface LintOptions {
  root?: string
}

interface Violation {
  file: string
  path: string   // human-readable location e.g. "Order.PlaceOrder (command)"
  field: "description" | "guidance"
}

const discoverContextFiles = async (root: string): Promise<string[]> => {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name === "node_modules") continue
        if (e.isDirectory()) await walk(join(dir, e.name))
        else if (e.name.endsWith(".context.yaml")) results.push(join(dir, e.name))
      }
    } catch { /* skip unreadable */ }
  }
  await walk(root)
  return results
}

export const runLint = (opts: LintOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(opts.root ?? process.cwd())
    const files = yield* Effect.promise(() => discoverContextFiles(root))

    if (files.length === 0) {
      console.log("No *.context.yaml files found.")
      return 0
    }

    const violations: Violation[] = []

    for (const file of files) {
      const vocab = yield* readVocabFile(file).pipe(
        Effect.tapError((e) => Effect.sync(() => console.error(`  Warning: skipping ${file}: ${e.message}`))),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (!vocab || vocab.kind !== "BoundedContext") continue

      const shortFile = file.replace(root + "/", "")

      // BoundedContext
      if (!vocab.description) violations.push({ file: shortFile, path: `${vocab.name} (context)`, field: "description" })
      if (!vocab.guidance)    violations.push({ file: shortFile, path: `${vocab.name} (context)`, field: "guidance" })

      for (const agg of vocab.aggregates ?? []) {
        if (!agg.description) violations.push({ file: shortFile, path: `${agg.name} (aggregate)`, field: "description" })
        if (!agg.guidance)    violations.push({ file: shortFile, path: `${agg.name} (aggregate)`, field: "guidance" })

        for (const cmd of agg.commands ?? []) {
          if (!cmd.description) violations.push({ file: shortFile, path: `${agg.name}.${cmd.name} (command)`, field: "description" })
          if (!cmd.guidance)    violations.push({ file: shortFile, path: `${agg.name}.${cmd.name} (command)`, field: "guidance" })
        }
        for (const evt of agg.events ?? []) {
          if (!evt.description) violations.push({ file: shortFile, path: `${agg.name}.${evt.name} (event)`, field: "description" })
          if (!evt.guidance)    violations.push({ file: shortFile, path: `${agg.name}.${evt.name} (event)`, field: "guidance" })
        }
        for (const ent of agg.entities ?? []) {
          if (!ent.description) violations.push({ file: shortFile, path: `${agg.name}.${ent.name} (entity)`, field: "description" })
        }
        for (const vo of agg.valueObjects ?? []) {
          if (!vo.description) violations.push({ file: shortFile, path: `${agg.name}.${vo.name} (valueObject)`, field: "description" })
        }
      }

      for (const q of vocab.queries ?? []) {
        if (!q.description) violations.push({ file: shortFile, path: `${q.name} (query)`, field: "description" })
        if (!q.guidance)    violations.push({ file: shortFile, path: `${q.name} (query)`, field: "guidance" })
      }

      for (const rm of vocab.readModels ?? []) {
        if (!rm.description) violations.push({ file: shortFile, path: `${rm.name} (readModel)`, field: "description" })
      }

      for (const svc of vocab.domainServices ?? []) {
        if (!svc.description) violations.push({ file: shortFile, path: `${svc.name} (domainService)`, field: "description" })
      }
    }

    if (violations.length === 0) {
      console.log(`✓  All primitives documented across ${files.length} context file${files.length !== 1 ? "s" : ""}.`)
      return 0
    }

    // Group violations by file for readable output
    const byFile = new Map<string, Violation[]>()
    for (const v of violations) {
      if (!byFile.has(v.file)) byFile.set(v.file, [])
      byFile.get(v.file)!.push(v)
    }

    console.error(`✗  ${violations.length} missing description${violations.length !== 1 ? "s" : ""} across ${byFile.size} file${byFile.size !== 1 ? "s" : ""}:\n`)
    for (const [file, vs] of byFile) {
      console.error(`  ${file}`)
      for (const v of vs) {
        console.error(`    missing ${v.field.padEnd(11)}  ${v.path}`)
      }
      console.error()
    }

    return 1
  })
