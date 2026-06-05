import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { isGoldenFixturePath } from "./discovery.js"
import { GENERATED_HEADER, computeVocabHash } from "./generated-files.js"

const discoverFiles = async (root: string, suffixes: ReadonlyArray<string>): Promise<string[]> => {
  try {
    const entries = await readdir(root, { recursive: true })
    return entries
      .filter((entry) => !entry.includes("node_modules"))
      .filter((entry) => !isGoldenFixturePath(entry))
      .filter((entry) => suffixes.some((suffix) => entry.endsWith(suffix)))
      .map((entry) => join(root, entry))
  } catch {
    return []
  }
}

export async function checkGeneratedSync(root: string): Promise<number> {
  const cwd = resolve(root)
  const currentHash = await computeVocabHash(cwd)
  const tsFiles = await discoverFiles(cwd, [".ts"])
  const errors: string[] = []
  let taggedCount = 0

  for (const file of tsFiles) {
    const content = await readFile(file, "utf8")
    const match = content.match(GENERATED_HEADER)
    if (!match) continue

    taggedCount += 1
    const fileHash = match[1]
    if (!fileHash) {
      errors.push(`  ${relative(cwd, file)}: generated header is missing vocab-hash`)
      continue
    }

    if (fileHash !== currentHash) {
      errors.push(
        `  ${relative(cwd, file)}: stale vocab-hash ${fileHash.slice(0, 12)} (expected ${currentHash.slice(0, 12)})`,
      )
    }
  }

  if (errors.length > 0) {
    console.error(`✗  Generated-sync violations:\n\n${errors.join("\n")}\n`)
    console.error(`${errors.length} violation${errors.length === 1 ? "" : "s"} → FAIL`)
    return 1
  }

  console.log(`✓  Generated-sync valid (${taggedCount} tagged file${taggedCount === 1 ? "" : "s"}).`)
  return 0
}
