import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Effect } from "effect"
import { readVocabFile, type VocabFile } from "@rta/vocab"
import { isGoldenFixturePath } from "./discovery.js"
import {
  deriveConnectionsOperationEventContracts,
  deriveContextOperationEventContracts,
  formatOperationEventMarker,
  type OperationEventContract,
} from "./operation-events.js"

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
      // Other checks own parse failures.
    }
  }
  return parsed
}

const collectContracts = async (root: string): Promise<OperationEventContract[]> => {
  const parsed = await loadParsed(root)
  const contracts: OperationEventContract[] = []
  for (const vocab of parsed.values()) {
    if (vocab.kind === "BoundedContext") {
      contracts.push(...deriveContextOperationEventContracts(vocab))
    } else if (vocab.kind === "Connections") {
      contracts.push(...deriveConnectionsOperationEventContracts(vocab))
    }
  }
  return contracts
}

export async function checkOperationEvents(root: string): Promise<number> {
  const cwd = resolve(root)
  const contracts = await collectContracts(cwd)
  const testFiles = await discoverFiles(cwd, ".ts")
  const testContent = (await Promise.all(testFiles.map((file) => readFile(file, "utf8")))).join("\n")
  const missing = contracts.filter((contract) =>
    !testContent.includes(formatOperationEventMarker(contract.id)),
  )

  if (missing.length === 0) {
    console.log(`✓  Operation event contracts: ${contracts.length}/${contracts.length} readable log contracts satisfied.`)
    return 0
  }

  console.error("✗  Missing operation event contracts:\n")
  for (const item of missing) {
    const location = item.aggregate !== undefined
      ? `${item.context} / ${item.aggregate}`
      : item.context
    console.error(`  ${item.id} (${location})  ${item.description}`)
  }
  console.error(`\n${missing.length} missing operation event contract${missing.length === 1 ? "" : "s"} → FAIL`)
  return 1
}
