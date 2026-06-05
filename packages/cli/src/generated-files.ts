import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { isGoldenFixturePath } from "./discovery.js"

export const GENERATED_HEADER = /@rta-generated(?:\s+vocab-hash:([a-f0-9]+))?/i

const discoverFiles = async (
  root: string,
  suffixes: ReadonlyArray<string>,
): Promise<string[]> => {
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

export const computeVocabHash = async (root: string): Promise<string> => {
  const cwd = resolve(root)
  const files = (await discoverFiles(cwd, [
    ".context.yaml",
    ".connections.yaml",
    ".archetype.yaml",
  ])).sort()

  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(relative(cwd, file))
    hash.update("\n")
    hash.update(await readFile(file, "utf8"))
    hash.update("\n")
  }
  return hash.digest("hex")
}

export const formatGeneratedHeader = (vocabHash: string) =>
  `// @rta-generated vocab-hash:${vocabHash}`
