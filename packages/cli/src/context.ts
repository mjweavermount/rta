import { Effect } from "effect"
import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { readVocabFile } from "@rta/vocab"
import { formatSnapshot, type VocabSnapshot } from "./format/context-formatter.js"
import { isGoldenFixturePath } from "./discovery.js"

// ---------------------------------------------------------------------------
// Discover vocab files
// ---------------------------------------------------------------------------

const discoverByExtension = (root: string, suffix: string) =>
  Effect.promise(async () => {
    try {
      const entries = await readdir(root, { recursive: true })
      return entries
        .filter((e) => e.endsWith(suffix) && !e.includes("node_modules"))
        .filter((e) => !isGoldenFixturePath(e))
        .map((e) => join(root, e))
    } catch {
      return [] as string[]
    }
  })

// ---------------------------------------------------------------------------
// Load vocab snapshot
// ---------------------------------------------------------------------------

const loadSnapshot = (root: string): Effect.Effect<VocabSnapshot> =>
  Effect.gen(function* () {
    const contextPaths = yield* discoverByExtension(root, ".context.yaml")
    const connectionPaths = yield* discoverByExtension(root, ".connections.yaml")
    const ardPaths = yield* discoverByExtension(root, ".ard.yaml")

    const contextFiles = yield* Effect.forEach(contextPaths, (p) =>
      readVocabFile(p).pipe(Effect.option),
    )
    const connectionFiles = yield* Effect.forEach(connectionPaths, (p) =>
      readVocabFile(p).pipe(Effect.option),
    )

    const contexts = contextFiles
      .flatMap((o) => (o._tag === "Some" ? [o.value] : []))
      .filter((v) => v.kind === "BoundedContext")
      .map((v) => v as Extract<typeof v, { kind: "BoundedContext" }>)

    const connections = connectionFiles
      .flatMap((o) => (o._tag === "Some" ? [o.value] : []))
      .filter((v) => v.kind === "Connections")
      .map((v) => v as Extract<typeof v, { kind: "Connections" }>)

    return { contexts, connections, ardCount: ardPaths.length, root }
  })

// ---------------------------------------------------------------------------
// context command
// ---------------------------------------------------------------------------

export interface ContextOptions {
  readonly root?: string
}

export const runContext = (options: ContextOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(options.root ?? process.cwd())
    const snapshot = yield* loadSnapshot(root)
    console.log(formatSnapshot(snapshot))
    return 0
  })
