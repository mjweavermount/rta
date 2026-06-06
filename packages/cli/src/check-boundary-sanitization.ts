import { Effect } from "effect"
import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { readVocabFile } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

async function discoverContextFiles(root: string): Promise<string[]> {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist") continue
        if (entry.isDirectory()) await walk(join(dir, entry.name))
        else if (entry.name.endsWith(".context.yaml")) results.push(join(dir, entry.name))
      }
    } catch {
      // ignore unreadable directories
    }
  }
  await walk(root)
  return results
}

export async function checkBoundarySanitization(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverContextFiles(cwd)
  const errors: string[] = []
  let schemaCount = 0
  let pipelineCount = 0

  for (const path of paths) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => errors.push(`${path}: ${error.message}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      ),
    )
    if (parsed === null || parsed.kind !== "BoundedContext") continue

    schemaCount += parsed.boundarySchemas?.length ?? 0
    pipelineCount += (parsed.adapterBindings ?? []).filter((binding) => binding.boundaryPipeline).length
  }

  if (errors.length > 0) {
    console.error(`✗  Boundary sanitization violations:\n\n${errors.map((error) => `  ${error}`).join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(
    `✓  Boundary sanitization valid: ${schemaCount} boundary schema${schemaCount === 1 ? "" : "s"} and ${pipelineCount} promotion pipeline${pipelineCount === 1 ? "" : "s"} checked.`,
  )
  return 0
}
