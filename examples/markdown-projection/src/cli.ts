#!/usr/bin/env node
import {
  createFilesystemMarkdownSourcePort,
  explainProjection,
  runLocalProjection,
  statePaths,
  verifyLocalProjection,
  type LocalProjectionOptions,
} from "./local.js"

const valueAfter = (args: ReadonlyArray<string>, flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

const optionsFrom = (argv: ReadonlyArray<string>): LocalProjectionOptions => ({
  sourceRoot: valueAfter(argv, "--source-root") ?? process.cwd(),
  sourceId: valueAfter(argv, "--source-id") ?? "collective-docs",
  kind: valueAfter(argv, "--kind") === "personal-obsidian-vault" ? "personal-obsidian-vault" : "shared-git-markdown",
  stateRoot: valueAfter(argv, "--state-root") ?? "tmp/markdown-projection-state",
})

const usage = "usage: markdown-projection plan|apply|verify|explain|doctor [--source-root dir] [--source-id id] [--state-root dir] [--kind shared-git-markdown|personal-obsidian-vault] [--path source.md|--affine-doc-id id]"

export const runCli = (
  argv: ReadonlyArray<string>,
  io: { readonly log: (line: string) => void } = console,
): number => {
  const command = argv[0] ?? "help"
  const options = optionsFrom(argv)

  if (command === "doctor") {
    io.log(JSON.stringify({
      app: "markdown-projection",
      state: statePaths(options.stateRoot, options.sourceId),
      sourceRoot: options.sourceRoot,
      sourceId: options.sourceId,
      liveAffine: false,
    }, null, 2))
    return 0
  }

  if (command === "plan") {
    const source = createFilesystemMarkdownSourcePort(options.sourceRoot)
    io.log(JSON.stringify({
      sourceId: options.sourceId,
      files: source.listFiles({ sourceId: options.sourceId, kind: options.kind, rootLabel: options.sourceRoot }).map((file) => ({
        path: file.path,
        contentHash: file.contentHash,
        commit: file.commit,
      })),
      renames: source.renameEvidence({ sourceId: options.sourceId, kind: options.kind, rootLabel: options.sourceRoot }),
    }, null, 2))
    return 0
  }

  if (command === "apply") {
    io.log(JSON.stringify(runLocalProjection(options), null, 2))
    return 0
  }

  if (command === "verify") {
    const result = verifyLocalProjection(options)
    io.log(JSON.stringify(result, null, 2))
    return result.ok ? 0 : 1
  }

  if (command === "explain") {
    const result = explainProjection({
      ...options,
      sourcePath: valueAfter(argv, "--path"),
      affineDocId: valueAfter(argv, "--affine-doc-id"),
    })
    io.log(JSON.stringify(result ?? null, null, 2))
    return result ? 0 : 1
  }

  io.log(usage)
  return command === "help" ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCli(process.argv.slice(2)))
}
