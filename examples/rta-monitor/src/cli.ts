#!/usr/bin/env node
import { listFailures, listRuns, showRun, summarizeRun } from "./index.js"

const valueAfter = (args: ReadonlyArray<string>, flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

export const runCli = (
  argv: ReadonlyArray<string>,
  io: { readonly log: (line: string) => void } = console,
): number => {
  const command = argv[0] ?? "runs"
  const root = valueAfter(argv, "--root") ?? process.cwd()

  if (command === "runs") {
    for (const run of listRuns(root)) io.log(summarizeRun(run))
    return 0
  }

  if (command === "failures") {
    for (const run of listFailures(root)) io.log(summarizeRun(run))
    return 0
  }

  if (command === "show") {
    const runId = argv[1]
    if (!runId || runId.startsWith("--")) {
      io.log("usage: rta-monitor show <runId> [--root dir]")
      return 1
    }
    io.log(JSON.stringify(showRun(root, runId), null, 2))
    return 0
  }

  if (command === "tail") {
    const latest = listRuns(root).at(-1)
    io.log(latest?.readableLog.trim() ?? "")
    return 0
  }

  io.log("usage: rta-monitor runs|failures|tail|show <runId> [--root dir]")
  return command === "help" ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCli(process.argv.slice(2)))
}
