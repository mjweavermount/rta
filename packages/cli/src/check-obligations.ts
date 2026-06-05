import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Effect } from "effect"
import { readVocabFile } from "@rta/vocab"
import {
  deriveContextObligations,
  deriveConnectionsObligations,
  formatObligationMarker,
  type Obligation,
} from "./obligations.js"
import { shouldSkipWalkDir } from "./discovery.js"

async function discoverFiles(root: string, suffixes: ReadonlyArray<string>): Promise<string[]> {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist") continue
        if (entry.isDirectory()) await walk(join(dir, entry.name))
        else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) {
          results.push(join(dir, entry.name))
        }
      }
    } catch {
      // ignore unreadable directories
    }
  }
  await walk(root)
  return results
}

const loadTestContent = async (root: string): Promise<string> => {
  const testFiles = await discoverFiles(root, [".test.ts", ".spec.ts"])
  const contents = await Promise.all(
    testFiles.map(async (file) => {
      try {
        return await readFile(file, "utf8")
      } catch {
        return ""
      }
    }),
  )
  return contents.join("\n")
}

const collectObligations = async (root: string): Promise<ReadonlyArray<Obligation>> => {
  const contextFiles = await discoverFiles(root, [".context.yaml"])
  const connectionFiles = await discoverFiles(root, [".connections.yaml"])
  const obligations: Obligation[] = []

  for (const path of contextFiles) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(Effect.orElse(() => Effect.succeed(null))),
    )
    if (parsed === null || parsed.kind !== "BoundedContext") continue
    obligations.push(...deriveContextObligations(parsed))
  }

  for (const path of connectionFiles) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(Effect.orElse(() => Effect.succeed(null))),
    )
    if (parsed === null || parsed.kind !== "Connections") continue
    obligations.push(...deriveConnectionsObligations(parsed))
  }

  return obligations
}

export async function checkObligationCoverage(root: string): Promise<number> {
  const cwd = resolve(root)
  const obligations = await collectObligations(cwd)
  const testContent = await loadTestContent(cwd)

  const missing = obligations.filter(
    (obligation) => !testContent.includes(formatObligationMarker(obligation.id)),
  )

  if (missing.length === 0) {
    console.log(
      `✓  Obligation coverage: ${obligations.length}/${obligations.length} obligations satisfied.`,
    )
    return 0
  }

  console.error("✗  Obligation coverage gaps:\n")
  for (const obligation of missing) {
    const location = obligation.aggregate !== undefined
      ? `${obligation.context} / ${obligation.aggregate}`
      : obligation.context
    console.error(
      `  ${obligation.id} (${location})  ${obligation.description}`,
    )
  }
  console.error()
  console.error(`${missing.length} missing obligation${missing.length === 1 ? "" : "s"} → FAIL`)
  return 1
}
