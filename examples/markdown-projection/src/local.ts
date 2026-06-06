import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { Effect } from "effect"
import { ContextFactory } from "@rta/core"
import {
  MarkdownProjectionContext,
  type AffineProjectionPort,
  type AffineProjectionReceipt,
  type GitRenameEvidence,
  type MarkdownFile,
  type MarkdownProjectionDeps,
  type MarkdownProjectionRunReceipt,
  type MarkdownSource,
  type MarkdownSourcePort,
  type ProjectionRecord,
  type ProjectionRegistry,
  type ReadonlyProjectionDoc,
  type SourceKind,
} from "./index.js"

interface RegistryFile {
  readonly records: ReadonlyArray<ProjectionRecord>
}

interface AffineStoreFile {
  readonly docs: ReadonlyArray<ReadonlyProjectionDoc>
}

export interface LocalProjectionOptions {
  readonly sourceRoot: string
  readonly sourceId: string
  readonly kind: SourceKind
  readonly stateRoot: string
}

export interface ProjectionVerification {
  readonly sourceId: string
  readonly ok: boolean
  readonly projectedDocs: number
  readonly missingDocs: ReadonlyArray<string>
  readonly editableDocs: ReadonlyArray<string>
  readonly nonBotOwnedDocs: ReadonlyArray<string>
}

export interface MarkdownProjectionDemoResult {
  readonly demoRoot: string
  readonly sourceRoot: string
  readonly stateRoot: string
  readonly sourceId: string
  readonly firstProjectedDocs: number
  readonly secondProjectedDocs: number
  readonly renamedDocIdStable: boolean
  readonly renamedDocId?: string
  readonly verification: ProjectionVerification
  readonly projectedPaths: ReadonlyArray<string>
  readonly note: string
}

const readJson = <T>(path: string, fallback: T): T => {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, "utf8")) as T
}

const writeJson = (path: string, value: unknown): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const normalizeRelativePath = (root: string, path: string): string =>
  relative(root, path).split(sep).join("/")

export const hashMarkdown = (markdown: string): string =>
  createHash("sha256").update(markdown).digest("hex")

const currentGitCommit = (root: string): string | undefined => {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return undefined
  }
}

const gitRenameEvidence = (root: string): ReadonlyArray<GitRenameEvidence> => {
  try {
    const output = execFileSync("git", [
      "-C",
      root,
      "log",
      "--find-renames=20%",
      "--diff-filter=R",
      "--name-status",
      "--format=commit:%H",
      "--",
      "*.md",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    const evidence: GitRenameEvidence[] = []
    let commit = "unknown"
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue
      if (line.startsWith("commit:")) {
        commit = line.slice("commit:".length)
        continue
      }
      const [status, fromPath, toPath] = line.split(/\t/)
      if (!status?.startsWith("R") || !fromPath || !toPath) continue
      evidence.push({
        fromPath,
        toPath,
        similarity: Number(status.slice(1)) || 0,
        commit,
      })
    }
    return evidence
  } catch {
    return []
  }
}

const runGit = (root: string, args: ReadonlyArray<string>): string =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim()

const commitAll = (root: string, message: string): void => {
  runGit(root, ["add", "."])
  runGit(root, ["commit", "-m", message])
}

const walkMarkdown = (root: string, dir = root): ReadonlyArray<string> => {
  const paths: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      paths.push(...walkMarkdown(root, fullPath))
      continue
    }
    if (stat.isFile() && entry.endsWith(".md")) paths.push(fullPath)
  }
  return paths.sort()
}

export const createFilesystemMarkdownSourcePort = (sourceRoot: string): MarkdownSourcePort => {
  const root = resolve(sourceRoot)
  return {
    listFiles: () => {
      const commit = currentGitCommit(root)
      return walkMarkdown(root).map((path): MarkdownFile => {
        const markdown = readFileSync(path, "utf8")
        return {
          path: normalizeRelativePath(root, path),
          markdown,
          contentHash: hashMarkdown(markdown),
          ...(commit ? { commit } : {}),
        }
      })
    },
    renameEvidence: () => gitRenameEvidence(root),
  }
}

export class JsonProjectionRegistry implements ProjectionRegistry {
  constructor(private readonly path: string) {}

  findByPath(sourceId: string, path: string): ProjectionRecord | undefined {
    return this.records().find((record) => record.sourceId === sourceId && record.sourcePath === path)
  }

  findByAlias(sourceId: string, path: string): ProjectionRecord | undefined {
    return this.records().find((record) => record.sourceId === sourceId && record.knownAliases.includes(path))
  }

  save(record: ProjectionRecord): ProjectionRecord {
    const records = this.records().filter((existing) =>
      !(existing.sourceId === record.sourceId && (
        existing.sourcePath === record.sourcePath || existing.affineDocId === record.affineDocId
      )),
    )
    records.push(record)
    writeJson(this.path, { records: records.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)) })
    return record
  }

  all(): ReadonlyArray<ProjectionRecord> {
    return this.records()
  }

  private records(): ReadonlyArray<ProjectionRecord> {
    return readJson<RegistryFile>(this.path, { records: [] }).records
  }
}

export class JsonAffineProjectionPort implements AffineProjectionPort {
  constructor(private readonly path: string) {}

  upsertReadOnly(projection: ReadonlyProjectionDoc): AffineProjectionReceipt {
    const docs = this.docs().filter((doc) => doc.affineDocId !== projection.affineDocId)
    const action = docs.length === this.docs().length ? "created" : "updated"
    docs.push(projection)
    writeJson(this.path, { docs: docs.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)) })
    return {
      affineDocId: projection.affineDocId,
      action,
      owner: "projection-bot",
      editableInAffine: false,
      summary: `Projected ${projection.sourcePath} as bot-owned read-only AFFiNE doc ${projection.affineDocId}.`,
    }
  }

  all(): ReadonlyArray<ReadonlyProjectionDoc> {
    return this.docs()
  }

  private docs(): ReadonlyArray<ReadonlyProjectionDoc> {
    return readJson<AffineStoreFile>(this.path, { docs: [] }).docs
  }
}

export const statePaths = (stateRoot: string, sourceId: string): {
  readonly registryPath: string
  readonly affineStorePath: string
} => ({
  registryPath: join(stateRoot, sourceId, "projection-registry.json"),
  affineStorePath: join(stateRoot, sourceId, "affine-store.json"),
})

export const createLocalProjectionDeps = (options: LocalProjectionOptions): MarkdownProjectionDeps & {
  readonly registryStore: JsonProjectionRegistry
  readonly affineStore: JsonAffineProjectionPort
} => {
  const paths = statePaths(options.stateRoot, options.sourceId)
  const registryStore = new JsonProjectionRegistry(paths.registryPath)
  const affineStore = new JsonAffineProjectionPort(paths.affineStorePath)
  return {
    source: createFilesystemMarkdownSourcePort(options.sourceRoot),
    registry: registryStore,
    registryStore,
    affine: affineStore,
    affineStore,
    generateDocId: (file) => `affine-${hashMarkdown(`${options.sourceId}:${file.path}`).slice(0, 12)}`,
  }
}

export const runLocalProjection = (options: LocalProjectionOptions): MarkdownProjectionRunReceipt => {
  const deps = createLocalProjectionDeps(options)
  const source: MarkdownSource = {
    sourceId: options.sourceId,
    kind: options.kind,
    rootLabel: resolve(options.sourceRoot),
  }
  const scope = new ContextFactory().createExternal({ actorId: "projection-bot" }).promote("internal", {
    message: "project source-owned Markdown into AFFiNE",
  })
  return Effect.runSync(new MarkdownProjectionContext().invoke({ source, deps }, scope))
}

export const verifyLocalProjection = (options: Pick<LocalProjectionOptions, "sourceId" | "stateRoot">): ProjectionVerification => {
  const paths = statePaths(options.stateRoot, options.sourceId)
  const registry = new JsonProjectionRegistry(paths.registryPath).all()
  const docs = new JsonAffineProjectionPort(paths.affineStorePath).all()
  const missingDocs = registry
    .filter((record) => !docs.some((doc) => doc.affineDocId === record.affineDocId))
    .map((record) => record.sourcePath)
  const editableDocs = docs
    .filter((doc) => doc.editableInAffine !== false)
    .map((doc) => doc.sourcePath)
  const nonBotOwnedDocs = docs
    .filter((doc) => doc.owner !== "projection-bot")
    .map((doc) => doc.sourcePath)
  return {
    sourceId: options.sourceId,
    ok: missingDocs.length === 0 && editableDocs.length === 0 && nonBotOwnedDocs.length === 0,
    projectedDocs: docs.length,
    missingDocs,
    editableDocs,
    nonBotOwnedDocs,
  }
}

export const explainProjection = (options: Pick<LocalProjectionOptions, "sourceId" | "stateRoot"> & {
  readonly sourcePath?: string
  readonly affineDocId?: string
}): ProjectionRecord | undefined => {
  const paths = statePaths(options.stateRoot, options.sourceId)
  const records = new JsonProjectionRegistry(paths.registryPath).all()
  return records.find((record) =>
    (options.sourcePath !== undefined && record.sourcePath === options.sourcePath)
    || (options.affineDocId !== undefined && record.affineDocId === options.affineDocId),
  )
}

export const runMarkdownProjectionDemo = (demoRoot = "tmp/markdown-projection-demo"): MarkdownProjectionDemoResult => {
  const root = resolve(demoRoot)
  const sourceRoot = join(root, "mock-rta-docs")
  const stateRoot = join(root, "projection-state")
  const sourceId = "mock-rta-docs"
  rmSync(root, { recursive: true, force: true })
  mkdirSync(join(sourceRoot, "rta"), { recursive: true })

  writeFileSync(join(sourceRoot, "README.md"), [
    "# Mock RTA Knowledge Base",
    "",
    "This repo is intentionally plain Markdown. It has no RTA sidecars.",
    "The projection operator reads it as a source-owned documentation repo.",
    "",
  ].join("\n"))
  writeFileSync(join(sourceRoot, "rta", "concept.md"), [
    "# RTA Conceptual Overview",
    "",
    "RTA is an app-authoring vocabulary and runtime discipline.",
    "Apps are described through primitives, patterns, archetypes, ports, policies, and adapters.",
    "The goal is to help agents build systems with observable boundaries instead of loose vibes.",
    "",
  ].join("\n"))
  writeFileSync(join(sourceRoot, "rta", "status.md"), [
    "# RTA Status",
    "",
    "This is a demo status, not an exhaustive status report.",
    "The current mock says RTA has a working Markdown projection slice with local registry persistence.",
    "Live AFFiNE writing remains the next adapter step.",
    "",
  ].join("\n"))

  runGit(sourceRoot, ["init"])
  runGit(sourceRoot, ["config", "user.email", "projection-demo@example.test"])
  runGit(sourceRoot, ["config", "user.name", "Projection Demo"])
  commitAll(sourceRoot, "initial rta docs")

  const first = runLocalProjection({
    sourceRoot,
    sourceId,
    kind: "shared-git-markdown",
    stateRoot,
  })
  const statusBefore = first.registryRecords.find((record) => record.sourcePath === "rta/status.md")

  mkdirSync(join(sourceRoot, "rta", "reports"), { recursive: true })
  runGit(sourceRoot, ["mv", "rta/status.md", "rta/reports/current-status.md"])
  writeFileSync(join(sourceRoot, "rta", "reports", "current-status.md"), [
    "# RTA Status",
    "",
    "This is still a demo status, not an exhaustive status report.",
    "The current mock says RTA has a working Markdown projection slice with local registry persistence.",
    "Live AFFiNE writing remains the next adapter step.",
    "The rename demonstrates that Git history can preserve projection identity.",
    "",
  ].join("\n"))
  commitAll(sourceRoot, "rename rta status doc")

  const second = runLocalProjection({
    sourceRoot,
    sourceId,
    kind: "shared-git-markdown",
    stateRoot,
  })
  const statusAfter = explainProjection({
    sourceId,
    stateRoot,
    sourcePath: "rta/reports/current-status.md",
  })
  const verification = verifyLocalProjection({ sourceId, stateRoot })

  return {
    demoRoot: root,
    sourceRoot,
    stateRoot,
    sourceId,
    firstProjectedDocs: first.projected.length,
    secondProjectedDocs: second.projected.length,
    renamedDocIdStable: statusBefore?.affineDocId === statusAfter?.affineDocId,
    renamedDocId: statusAfter?.affineDocId,
    verification,
    projectedPaths: second.registryRecords.map((record) => record.sourcePath).sort(),
    note: "Demo only: proves local source scan, external registry, bot-owned read-only projection sink, CLI flow, and Git rename continuity. It does not exhaustively prove live AFFiNE behavior.",
  }
}
