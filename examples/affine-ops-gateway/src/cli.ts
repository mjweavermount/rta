#!/usr/bin/env node
import { createFakeGatewayDeps, runTool, type ToolName } from "./index.js"

const tools = new Set<ToolName>([
  "affine.ping",
  "affine.current_user",
  "affine.list_workspaces",
  "affine.recent_docs",
  "affine.doc_read",
  "affine.schema_summary",
  "affine.doc_update",
])

const valueAfter = (args: ReadonlyArray<string>, flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

export const runCli = (
  argv: ReadonlyArray<string>,
  io: { readonly log: (line: string) => void } = console,
): number => {
  const command = argv[0] ?? "help"
  const root = valueAfter(argv, "--root") ?? process.cwd()
  const profile = valueAfter(argv, "--profile") ?? "fake"

  if (command === "doctor") {
    io.log(JSON.stringify({ app: "affine-ops-gateway", profile, root, writes: "fail-closed" }, null, 2))
    return 0
  }

  if (command !== "run") {
    io.log("usage: affine-ops-gateway run <tool> [--doc-id id] [--profile fake] [--root dir] [--trace] | doctor")
    return command === "help" ? 0 : 1
  }

  const tool = argv[1]
  if (!tool || !tools.has(tool as ToolName)) {
    io.log(`unknown tool: ${tool ?? ""}`)
    return 1
  }

  const docId = valueAfter(argv, "--doc-id")
  const result = runTool(
    { name: tool as ToolName, ...(docId ? { input: { docId } } : {}) },
    createFakeGatewayDeps(),
    { root, profile, trace: argv.includes("--trace") },
  )
  io.log(JSON.stringify({ runId: result.runId, receipt: result.receipt, runRoot: result.runRoot }, null, 2))
  return result.receipt.status === "completed" || result.receipt.status === "fail-closed" ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCli(process.argv.slice(2)))
}
