import { Effect } from "effect"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export interface GenerateAppOptions {
  readonly name: string
  readonly outDir: string
}

const slug = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rta-app"

const pascal = (name: string): string =>
  slug(name)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "RtaApp"

export const generateAppScaffold = (
  options: GenerateAppOptions,
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const appName = slug(options.name)
    const contextName = pascal(appName)
    const root = resolve(options.outDir)
    const rtaRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
    const localPackage = (path: string) => `file:${join(rtaRoot, path)}`
    const localRtaPackages = {
      "@rta/cli": localPackage("packages/cli"),
      "@rta/core": localPackage("packages/core"),
      "@rta/runtime": localPackage("packages/runtime"),
      "@rta/strict": localPackage("packages/strict"),
      "@rta/vocab": localPackage("packages/vocab"),
    }

    const dirs = [
      join(root, "src"),
      join(root, "vocab", "contexts"),
      join(root, "vocab", "connections"),
      join(root, "ards"),
      join(root, "test"),
    ]
    for (const dir of dirs) {
      yield* Effect.promise(() => mkdir(dir, { recursive: true }))
    }

    const files: Record<string, string> = {
      "package.json": `${JSON.stringify({
        name: appName,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          "app:build": "tsup src/app-cli.ts --format esm --out-dir dist",
          "app:run": "pnpm generate && pnpm app:build && node dist/app-cli.js run",
          "app:scenario": "pnpm generate && pnpm app:build && node dist/app-cli.js scenario",
          "app:watch": "pnpm generate && pnpm app:build && node dist/app-cli.js watch --trace",
          build: "tsc --noEmit",
          check: "rta generate --strict --out generated && rta check && tsc --noEmit && pnpm app:build",
          generate: "rta generate --strict --out generated",
          context: "rta context",
        },
        dependencies: {
          ...localRtaPackages,
          effect: "^3.0.0",
        },
        devDependencies: {
          tsup: "^8.0.0",
          typescript: "^5.4.0",
        },
        pnpm: {
          overrides: localRtaPackages,
        },
      }, null, 2)}\n`,
      "tsconfig.json": `${JSON.stringify({
        compilerOptions: {
          noEmit: true,
          rootDir: ".",
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          exactOptionalPropertyTypes: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.ts", "generated/**/*.ts"],
      }, null, 2)}\n`,
      "AGENTS.md": `# ${appName} RTA App\n\nUse vocab first. Run \`rta context\`, then \`rta generate --strict --out generated\`, then \`rta check\`.\n\nLeaf behavior should extend RTA primitives. Generated registry dispatch is wiring, not business logic.\n\nOperational paths:\n\n- \`pnpm app:run\` proves generated command dispatch.\n- \`pnpm app:scenario\` runs the same path as a named scenario.\n- \`pnpm app:watch\` prints trace-level readable operation logs so an agent/operator can inspect primitive behavior without reading source.\n`,
      "src/main.ts": `import { Effect } from "effect"\nimport { dispatchCommand } from "../generated/registry.js"\n\nexport const run = (raw: unknown) =>\n  dispatchCommand(${JSON.stringify(`${contextName}.Create${contextName}`)}, raw)\n\nif (import.meta.url === \`file://\${process.argv[1]}\`) {\n  Effect.runPromise(run({ name: "example" })).catch((error) => {\n    console.error(error)\n    process.exit(1)\n  })\n}\n`,
      "src/app-cli.ts": `import { existsSync, readFileSync, readdirSync } from "node:fs"\nimport { join, resolve } from "node:path"\nimport { Effect } from "effect"\nimport { FileRuntime, ReviewQueue, createRunId } from "@rta/runtime"\nimport { createReadableLogBuffer, type ReadableLogVerbosity } from "@rta/strict"\nimport { dispatchCommand, registry, stores, type RegistryOperation } from "../generated/registry.js"\n\nconst appName = ${JSON.stringify(appName)}\nconst operation = ${JSON.stringify(`${contextName}.Create${contextName}`)} as RegistryOperation\nconst root = resolve(process.cwd())\nconst args = process.argv.slice(2)\nconst command = args[0] ?? "help"\nconst subcommand = args[1]\nconst verbosity: ReadableLogVerbosity = args.includes("--trace") ? "trace" : "normal"\n\nconst flagValue = (flag: string): string | undefined => {\n  const index = args.indexOf(flag)\n  return index >= 0 ? args[index + 1] : undefined\n}\n\nconst payloadFromArgs = (): unknown => {\n  const value = flagValue("--json")\n  if (value) return JSON.parse(value)\n  return { name: "example" }\n}\n\nconst runDispatch = async (label: string) => {\n  const logs = createReadableLogBuffer({ verbosity })\n  const runtime = new FileRuntime({ root, runId: createRunId(label.replace(/[^a-z0-9_.-]/gi, "-")) })\n  try {\n    await Effect.runPromise(dispatchCommand(operation, payloadFromArgs()))\n    const logLines = logs.entries.map((entry) => entry.line)\n    runtime.saveArtifact("operation-log.txt", logLines.join("\\n"))\n    runtime.saveState({ status: "completed" })\n    console.log(\`\${label}: \${operation} completed\`)\n    console.log(\`run=\${runtime.runId}\`)\n    for (const line of logLines) console.log(line)\n  } finally {\n    logs.stop()\n  }\n}\n\nconst listRuns = (): string[] => {\n  const runsRoot = join(root, ".rta", "runs")\n  if (!existsSync(runsRoot)) return []\n  return readdirSync(runsRoot).filter((name) => existsSync(join(runsRoot, name, "state.json"))).sort()\n}\n\nconst showGraph = (runId: string) => {\n  const path = join(root, ".rta", "runs", runId, "artifacts", "provenance.json")\n  if (!existsSync(path)) throw new Error(\`no provenance graph for \${runId}\`)\n  console.log(readFileSync(path, "utf8"))\n}\n\nconst tailLogs = (runId: string) => {\n  const path = join(root, ".rta", "runs", runId, "artifacts", "operation-log.txt")\n  if (!existsSync(path)) throw new Error(\`no operation log for \${runId}\`)\n  console.log(readFileSync(path, "utf8"))\n}\n\nswitch (command) {\n  case "list": {\n    console.log(JSON.stringify({ operations: Object.keys(registry), stores: Object.keys(stores) }, null, 2))\n    break\n  }\n  case "status": {\n    console.log(JSON.stringify({ app: appName, runs: listRuns(), operations: Object.keys(registry).length }, null, 2))\n    break\n  }\n  case "run": {\n    await runDispatch("run")\n    break\n  }\n  case "scenario": {\n    if (subcommand === "replay") {\n      const runId = args[2]\n      if (!runId) throw new Error("usage: scenario replay <run-id>")\n      showGraph(runId)\n    } else {\n      await runDispatch(\`scenario:\${appName}.default\`)\n    }\n    break\n  }\n  case "watch": {\n    await runDispatch(\`watch:\${appName}.default\`)\n    break\n  }\n  case "review": {\n    const queue = new ReviewQueue({ root })\n    if (subcommand === "create") {\n      const runId = flagValue("--run") ?? listRuns().at(-1)\n      if (!runId) throw new Error("usage: review create --run <run-id>")\n      const item = queue.create({ runId, title: \`\${appName} review\`, artifactPath: join(root, ".rta", "runs", runId), summary: "Generated app run ready for QA/demo review" })\n      console.log(JSON.stringify(item, null, 2))\n    } else if (subcommand === "approve" || subcommand === "reject") {\n      const id = args[2]\n      const actor = flagValue("--actor") ?? "operator"\n      if (!id) throw new Error(\`usage: review \${subcommand} <review-id> [--actor name]\`)\n      console.log(JSON.stringify(queue.decide(id, { status: subcommand === "approve" ? "approved" : "rejected", actor }), null, 2))\n    } else {\n      console.log("usage: review create --run <run-id> | review approve <review-id> | review reject <review-id>")\n    }\n    break\n  }\n  case "logs": {\n    const runId = flagValue("--run") ?? listRuns().at(-1)\n    if (!runId) throw new Error("usage: logs tail --run <run-id>")\n    tailLogs(runId)\n    break\n  }\n  case "graph": {\n    const runId = flagValue("--run") ?? listRuns().at(-1)\n    if (!runId) throw new Error("usage: graph run --run <run-id>")\n    showGraph(runId)\n    break\n  }\n  case "doctor": {\n    console.log(JSON.stringify({ app: appName, generatedRegistry: Object.keys(registry).length > 0, runtimeRoot: join(root, ".rta") }, null, 2))\n    break\n  }\n  default: {\n    console.log(\`${appName} app CLI\\n\\nCommands:\\n  list\\n  status\\n  run [--json '{\"name\":\"example\"}']\\n  scenario [--json '{\"name\":\"example\"}']\\n  scenario replay <run-id>\\n  watch [--trace] [--json '{\"name\":\"example\"}']\\n  review create --run <run-id>\\n  review approve <review-id> [--actor name]\\n  review reject <review-id> [--actor name]\\n  logs tail [--run <run-id>]\\n  graph run [--run <run-id>]\\n  doctor\`)\n  }\n}\n`,
      [`vocab/contexts/${appName}.context.yaml`]: `kind: BoundedContext\nname: ${contextName}\nclassification: core-domain\n\naggregates:\n  - name: ${contextName}\n    id: { name: ${contextName}Id, backing: String }\n    commands:\n      - name: Create${contextName}\n        payload:\n          - { name: name, type: String }\n        emits: [${contextName}Created]\n    events:\n      - name: ${contextName}Created\n        payload:\n          - { name: id, type: String }\n          - { name: name, type: String }\n\nqueries:\n  - name: Get${contextName}\n    parameters:\n      - { name: id, type: String }\n    returns: ${contextName}ReadModel\n`,
      [`vocab/connections/${appName}.connections.yaml`]: `kind: Connections\ncontext: ${contextName}\n\npublishes:\n  - { event: ${contextName}Created, to: [] }\n\nsubscribes: []\n`,
      "ards/ARD-APP-000.ard.yaml": `id: ARD-APP-000\nkind: spirit\nfamily: app\nname: "App architecture rules"\ndescription: "App-specific architecture rules derived from RTA defaults"\nspirit:\n  - AGENTS.md#rta-app\nseverity: error\nchecks: []\nletters:\n  - ARD-APP-001\n`,
      "ards/ARD-APP-001.ard.yaml": `id: ARD-APP-001\nkind: letter\nfamily: app\nname: "Generated app stays valid"\ndescription: "Generated app code must compile and pass RTA checks"\nspirit:\n  - ARD-APP-000\nseverity: error\nchecks:\n  - description: "Generated app compiles through the local check script"\n    command: "pnpm check"\n`,
    }

    for (const [relativePath, content] of Object.entries(files)) {
      yield* Effect.promise(() => writeFile(join(root, relativePath), content, "utf8"))
    }

    console.log(root)
    return root
  })
