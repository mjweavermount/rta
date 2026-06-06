import { Effect } from "effect"
import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { readVocabFile, type BoundedContextDeclaration } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

const formatCause = (cause: unknown): string => {
  if (cause instanceof Error && cause.message.trim().length > 0) return cause.message
  if (typeof cause === "object" && cause !== null && "cause" in cause) {
    return formatCause((cause as { readonly cause: unknown }).cause)
  }
  return String(cause)
}

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

const summarize = (contexts: ReadonlyArray<BoundedContextDeclaration>) => {
  const intents = contexts.flatMap((context) =>
    (context.deploymentIntents ?? []).map((intent) => ({
      context: context.name,
      name: intent.name,
      target: intent.target,
      optional: intent.optional,
    })),
  )
  return {
    intents,
    containerCount: intents.filter((intent) => intent.target === "container").length,
    homeLabCount: intents.filter((intent) => intent.target === "home-lab").length,
    optionalHomeLabCount: intents.filter((intent) => intent.target === "home-lab" && intent.optional).length,
  }
}

export async function checkDeploymentContract(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverContextFiles(cwd)
  const contexts: BoundedContextDeclaration[] = []
  const errors: string[] = []

  for (const path of paths) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => errors.push(`${path}: ${formatCause(error)}`)),
        ),
        Effect.orElse(() => Effect.succeed(null)),
      ),
    )
    if (parsed === null || parsed.kind !== "BoundedContext") continue
    contexts.push(parsed)
  }

  const summary = summarize(contexts)

  if (errors.length > 0) {
    console.error(`✗  Deployment contract violations:\n\n${errors.map((error) => `  ${error}`).join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(
    `✓  Deployment contract valid: ${summary.intents.length} deployment intent${summary.intents.length === 1 ? "" : "s"} checked; ${summary.containerCount} container, ${summary.optionalHomeLabCount}/${summary.homeLabCount} optional home-lab.`,
  )
  return 0
}
