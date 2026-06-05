import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Effect } from "effect"
import { readVocabFile, type VocabFile } from "@rta/vocab"
import { isGoldenFixturePath } from "./discovery.js"
import {
  deriveConnectionsTelemetry,
  deriveContextTelemetry,
  formatTelemetryMarker,
  type ExecutionTelemetryExpectation,
} from "./telemetry.js"

const discoverFiles = async (root: string, suffix: string): Promise<string[]> => {
  try {
    const entries = await readdir(root, { recursive: true })
    return entries
      .filter((entry) => entry.endsWith(suffix) && !entry.includes("node_modules"))
      .filter((entry) => !isGoldenFixturePath(entry))
      .map((entry) => join(root, entry))
  } catch {
    return []
  }
}

const loadParsed = async (root: string): Promise<Map<string, VocabFile>> => {
  const parsed = new Map<string, VocabFile>()
  const paths = [
    ...(await discoverFiles(root, ".context.yaml")),
    ...(await discoverFiles(root, ".connections.yaml")),
  ]
  for (const path of paths) {
    try {
      parsed.set(path, await Effect.runPromise(readVocabFile(path)))
    } catch {
      // ignore unreadable vocab here; other checks own parse failures
    }
  }
  return parsed
}

const collectExpectations = async (root: string): Promise<ExecutionTelemetryExpectation[]> => {
  const parsed = await loadParsed(root)
  const expectations: ExecutionTelemetryExpectation[] = []
  for (const vocab of parsed.values()) {
    if (vocab.kind === "BoundedContext") {
      expectations.push(...deriveContextTelemetry(vocab))
    } else {
      expectations.push(...deriveConnectionsTelemetry(vocab))
    }
  }
  return expectations
}

export async function checkExecutionTelemetry(root: string): Promise<number> {
  const cwd = resolve(root)
  const expectations = await collectExpectations(cwd)
  const testFiles = await discoverFiles(cwd, ".ts")
  const testContent = (await Promise.all(testFiles.map((file) => readFile(file, "utf8")))).join("\n")
  const missing = expectations.filter((expectation) =>
    !testContent.includes(formatTelemetryMarker(expectation.id)),
  )

  if (missing.length === 0) {
    console.log(`✓  Execution telemetry coverage: ${expectations.length}/${expectations.length} expectations satisfied.`)
    return 0
  }

  console.error("✗  Missing execution telemetry coverage:\n")
  for (const item of missing) {
    const location = item.aggregate !== undefined
      ? `${item.context} / ${item.aggregate}`
      : item.context
    console.error(`  ${item.id} (${location})  ${item.description}`)
  }
  console.error(`\n${missing.length} missing telemetry expectation${missing.length === 1 ? "" : "s"} → FAIL`)
  return 1
}
