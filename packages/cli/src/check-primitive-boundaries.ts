import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { shouldSkipWalkDir } from "./discovery.js"

interface PrimitiveBoundaryIssue {
  readonly path: string
  readonly exportName: string
  readonly reason: string
}

const allowedFactoryNames = [
  "makeRule",
  "makeDecision",
  "makeReaction",
  "makeProcessManager",
  "transitionProcessManager",
  "defineCommand",
  "defineQuery",
  "defineDomainEvent",
  "defineStrictCommand",
  "defineStrictQuery",
  "defineStrictDomainEvent",
  "makeAggregateRoot",
  "raiseEvents",
  "Context.Tag",
  "Layer.",
  "Schema.",
  "Data.TaggedError",
]

const allowedPrimitiveNames = [
  "InstrumentedCommandHandler",
  "InstrumentedQueryHandler",
  "InstrumentedEventHandler",
  "InstrumentedPrimitive",
  "InstrumentedInboundAdapter",
  "InstrumentedOutboundAdapter",
  "InstrumentedBoundedContext",
  "InstrumentedScheduler",
  "InstrumentedJob",
  "InstrumentedProjector",
  "InstrumentedRepository",
  "InstrumentedPolicy",
  "InstrumentedGuardrail",
]

async function discoverSourceFiles(root: string): Promise<string[]> {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    const rel = relative(root, dir).replaceAll("\\", "/")
    if (
      rel === "generated-tests" ||
      rel.startsWith("generated-tests/") ||
      rel === "node_modules" ||
      rel.includes("/node_modules") ||
      rel === "dist" ||
      rel.includes("/dist")
    ) {
      return
    }

    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(path)
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
          results.push(path)
        }
      }
    } catch {
      // Ignore unreadable directories; other checks own parse failures.
    }
  }
  await walk(root)
  return results
}

function isAllowedBlock(block: string): boolean {
  if (/new\s+[A-Za-z0-9_]+Handler\(\)\.handle\(/.test(block)) return true
  return [...allowedFactoryNames, ...allowedPrimitiveNames].some((name) => block.includes(name))
}

function collectExportBlocks(content: string): ReadonlyArray<{ name: string; block: string }> {
  const matches = [...content.matchAll(/^export\s+(?:const|function|class)\s+([A-Za-z0-9_]+)/gm)]
  return matches.map((match, index) => {
    const start = match.index ?? 0
    const end = matches[index + 1]?.index ?? content.length
    return {
      name: match[1]!,
      block: content.slice(start, end),
    }
  })
}

export async function checkPrimitiveBoundaries(root: string): Promise<number> {
  const cwd = resolve(root)
  const files = await discoverSourceFiles(cwd)
  const issues: PrimitiveBoundaryIssue[] = []

  for (const file of files) {
    const content = await readFile(file, "utf8")
    const relPath = relative(cwd, file).replaceAll("\\", "/")
    if (content.includes("@rta-allow-naked-export")) continue

    for (const exported of collectExportBlocks(content)) {
      if (["registry", "stores", "routeManifest"].includes(exported.name)) continue
      if (
        relPath.endsWith("generated/registry.ts") &&
        ["dispatch", "dispatchCommand", "dispatchQuery", "dispatchEvent"].includes(exported.name)
      ) continue
      if (/^_[A-Za-z0-9]+Store$/.test(exported.name)) continue
      const isTypeOnly =
        exported.block.startsWith("export class") && exported.block.includes("extends Data.TaggedError")
      if (isTypeOnly) continue
      if (isAllowedBlock(exported.block)) continue

      issues.push({
        path: relPath,
        exportName: exported.name,
        reason: "exported behavior must extend an RTA primitive or use an approved RTA factory",
      })
    }
  }

  if (issues.length === 0) {
    console.log(`✓  Primitive boundaries: ${files.length} source file${files.length === 1 ? "" : "s"} checked.`)
    return 0
  }

  console.error("✗  Primitive boundary violations:\n")
  for (const issue of issues) {
    console.error(`  ${issue.path} :: ${issue.exportName} — ${issue.reason}`)
  }
  console.error(`\n${issues.length} primitive boundary violation${issues.length === 1 ? "" : "s"} → FAIL`)
  return 1
}
