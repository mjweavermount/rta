import { Effect } from "effect"
import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { readVocabFile, type BoundedContextDeclaration } from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

type BrandKind =
  | "ContextId"
  | "PortId"
  | "AdapterId"
  | "AdapterBindingId"
  | "BoundarySchemaId"
  | "PublishedLanguageId"
  | "OperationId"
  | "PolicyId"
  | "RuntimeCapabilityId"
  | "DeploymentIntentId"
  | "ToolSurfaceId"
  | "ToolId"

export interface BrandManifestEntry {
  readonly kind: BrandKind
  readonly context: string
  readonly name: string
  readonly brand: string
}

export interface AdapterFittingManifestEntry {
  readonly context: string
  readonly binding: string
  readonly port: string
  readonly adapter: string
  readonly inputSchema?: string
  readonly outputSchema?: string
}

export interface BrandManifest {
  readonly entries: ReadonlyArray<BrandManifestEntry>
  readonly adapterFittings: ReadonlyArray<AdapterFittingManifestEntry>
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

const entry = (
  kind: BrandKind,
  context: string,
  name: string,
): BrandManifestEntry => ({
  kind,
  context,
  name,
  brand: `${kind}:${context}.${name}`,
})

const addNames = (
  entries: BrandManifestEntry[],
  kind: BrandKind,
  context: string,
  names: ReadonlyArray<string> | undefined,
): void => {
  for (const name of names ?? []) {
    entries.push(entry(kind, context, name))
  }
}

export function buildBrandManifest(
  contexts: ReadonlyArray<BoundedContextDeclaration>,
): BrandManifest {
  const entries: BrandManifestEntry[] = []
  const adapterFittings: AdapterFittingManifestEntry[] = []

  for (const context of contexts) {
    entries.push(entry("ContextId", context.name, context.name))
    addNames(entries, "RuntimeCapabilityId", context.name, context.runtimeCapabilities?.map((item) => item.name))
    addNames(entries, "DeploymentIntentId", context.name, context.deploymentIntents?.map((item) => item.name))
    addNames(entries, "PortId", context.name, context.ports?.map((item) => item.name))
    addNames(entries, "BoundarySchemaId", context.name, context.boundarySchemas?.map((item) => item.name))
    addNames(entries, "AdapterBindingId", context.name, context.adapterBindings?.map((item) => item.name))
    addNames(entries, "PublishedLanguageId", context.name, context.publishedLanguages?.map((item) => item.name))
    addNames(entries, "OperationId", context.name, context.queries?.map((item) => item.name))

    for (const aggregate of context.aggregates ?? []) {
      addNames(entries, "OperationId", context.name, aggregate.commands?.map((item) => item.name))
      addNames(entries, "OperationId", context.name, aggregate.events?.map((item) => item.name))
      addNames(entries, "OperationId", context.name, aggregate.rules?.map((item) => item.name))
      addNames(entries, "OperationId", context.name, aggregate.decisions?.map((item) => item.name))
    }

    addNames(entries, "OperationId", context.name, context.processManagers?.map((item) => item.name))
    addNames(entries, "OperationId", context.name, context.decisions?.map((item) => item.name))

    for (const surface of context.toolSurfaces ?? []) {
      if (surface.policy) entries.push(entry("PolicyId", context.name, surface.policy))
      entries.push(entry("ToolSurfaceId", context.name, surface.name))
      addNames(entries, "ToolId", context.name, surface.tools.map((item) => `${surface.name}.${item.name}`))
      addNames(entries, "PolicyId", context.name, surface.tools.flatMap((item) => item.policy ? [item.policy] : []))
    }

    for (const binding of context.adapterBindings ?? []) {
      entries.push(entry("AdapterId", context.name, binding.adapter))
      adapterFittings.push({
        context: context.name,
        binding: binding.name,
        port: binding.port,
        adapter: binding.adapter,
        ...(binding.boundaryPipeline?.inputSchema === undefined
          ? {}
          : { inputSchema: binding.boundaryPipeline.inputSchema }),
        ...(binding.boundaryPipeline?.outputSchema === undefined
          ? {}
          : { outputSchema: binding.boundaryPipeline.outputSchema }),
      })
    }
  }

  return { entries, adapterFittings }
}

const validateBrandManifest = (manifest: BrandManifest): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const errors: string[] = []

  for (const item of manifest.entries) {
    const key = `${item.kind}:${item.context}:${item.name}`
    if (seen.has(key)) {
      errors.push(`${item.context}.${item.kind}.${item.name}: duplicate branded object`)
    }
    seen.add(key)
  }

  return errors
}

const validateAdapterFittings = (
  context: BoundedContextDeclaration,
): ReadonlyArray<string> => {
  const ports = new Map((context.ports ?? []).map((port) => [port.name, port]))
  const errors: string[] = []

  for (const binding of context.adapterBindings ?? []) {
    const port = ports.get(binding.port)
    if (!port || !binding.boundaryPipeline) continue

    const label = `${context.name}.adapterBinding.${binding.name}`
    const portInputs = new Set(port.inputSchemas ?? [])
    const portOutputs = new Set(port.outputSchemas ?? [])
    const inputSchema = binding.boundaryPipeline.inputSchema
    const outputSchema = binding.boundaryPipeline.outputSchema

    if (portInputs.size > 0 && !portInputs.has(inputSchema)) {
      errors.push(
        `${label}: pipeline input schema "${inputSchema}" does not fit port "${port.name}" input schemas (${[...portInputs].join(", ")})`,
      )
    }

    if (outputSchema && portOutputs.size > 0 && !portOutputs.has(outputSchema)) {
      errors.push(
        `${label}: pipeline output schema "${outputSchema}" does not fit port "${port.name}" output schemas (${[...portOutputs].join(", ")})`,
      )
    }
  }

  return errors
}

export async function checkBrandBloom(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverContextFiles(cwd)
  const contexts: BoundedContextDeclaration[] = []
  const errors: string[] = []

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
    contexts.push(parsed)
    errors.push(...validateAdapterFittings(parsed))
  }

  const manifest = buildBrandManifest(contexts)
  errors.push(...validateBrandManifest(manifest))

  if (errors.length > 0) {
    console.error(`✗  Brand bloom violations:\n\n${errors.map((error) => `  ${error}`).join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  const counts = manifest.entries.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1
    return acc
  }, {})
  const label = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => `${count} ${kind}`)
    .join(", ")

  console.log(
    `✓  Brand bloom valid: ${label}; ${manifest.adapterFittings.length} branded adapter fitting${manifest.adapterFittings.length === 1 ? "" : "s"} checked.`,
  )
  return 0
}
