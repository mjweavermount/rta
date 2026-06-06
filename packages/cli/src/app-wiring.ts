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

export interface WiringGraphEntry {
  readonly context: string
  readonly wiring: string
  readonly entrypoint: string
  readonly kind: string
  readonly surface?: string
  readonly tool?: string
  readonly adapterBinding?: string
  readonly inputSchema: string
  readonly operation: string
  readonly runtimeCapabilities: ReadonlyArray<string>
  readonly deploymentIntent?: string
  readonly demo: string
}

export interface WiringGraph {
  readonly entries: ReadonlyArray<WiringGraphEntry>
}

export function buildWiringGraph(contexts: ReadonlyArray<BoundedContextDeclaration>): WiringGraph {
  return {
    entries: contexts.flatMap((context) => {
      const wiring = context.appWiring
      if (!wiring) return []
      return wiring.entrypoints.map((entrypoint) => ({
        context: context.name,
        wiring: wiring.name,
        entrypoint: entrypoint.name,
        kind: entrypoint.kind,
        ...(entrypoint.surface === undefined ? {} : { surface: entrypoint.surface }),
        ...(entrypoint.tool === undefined ? {} : { tool: entrypoint.tool }),
        ...(entrypoint.adapterBinding === undefined ? {} : { adapterBinding: entrypoint.adapterBinding }),
        inputSchema: entrypoint.inputSchema,
        operation: entrypoint.operation,
        runtimeCapabilities: entrypoint.runtimeCapabilities ?? [],
        ...(entrypoint.deploymentIntent === undefined ? {} : { deploymentIntent: entrypoint.deploymentIntent }),
        demo: entrypoint.demo,
      }))
    }),
  }
}

const loadContexts = async (root: string): Promise<{
  readonly contexts: ReadonlyArray<BoundedContextDeclaration>
  readonly errors: ReadonlyArray<string>
}> => {
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

  return { contexts, errors }
}

export async function checkAppWiring(root: string): Promise<number> {
  const { contexts, errors } = await loadContexts(root)
  const graph = buildWiringGraph(contexts)

  if (errors.length > 0) {
    console.error(`✗  App wiring violations:\n\n${errors.map((error) => `  ${error}`).join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(
    `✓  App wiring valid: ${graph.entries.length} entrypoint${graph.entries.length === 1 ? "" : "s"} checked across ${contexts.filter((context) => context.appWiring).length} wired context${contexts.filter((context) => context.appWiring).length === 1 ? "" : "s"}.`,
  )
  return 0
}

export async function printWiringGraph(root: string): Promise<number> {
  const { contexts, errors } = await loadContexts(root)
  if (errors.length > 0) {
    console.error(`✗  App wiring graph unavailable:\n\n${errors.map((error) => `  ${error}`).join("\n")}\n`)
    return 1
  }

  const graph = buildWiringGraph(contexts)
  if (graph.entries.length === 0) {
    console.log("No app wiring entrypoints found.")
    return 0
  }

  for (const entry of graph.entries) {
    const surface = entry.surface
      ? `${entry.surface}${entry.tool ? `.${entry.tool}` : ""}`
      : entry.kind
    const adapter = entry.adapterBinding ?? "(no adapter binding)"
    const runtime = entry.runtimeCapabilities.length > 0
      ? entry.runtimeCapabilities.join(", ")
      : "(no runtime capability)"
    const deployment = entry.deploymentIntent ?? "(no deployment intent)"
    console.log(
      `${entry.context}.${entry.entrypoint}: entrypoint(${entry.kind}) -> surface(${surface}) -> adapter(${adapter}) -> schema(${entry.inputSchema}) -> operation(${entry.operation}) -> runtime(${runtime}) -> deployment(${deployment}) -> demo(${entry.demo})`,
    )
  }

  return 0
}

