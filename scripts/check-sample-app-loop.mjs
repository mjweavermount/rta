import { access, cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { constants as fsConstants } from "node:fs"
import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const cliEntryPath = resolve(root, "packages/cli/dist/rta.js")
const fixtureRoot = resolve(root, "fixtures/golden/pass")

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const run = (label, command, args, cwd) =>
  new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("close", (code) => {
      resolveRun({
        label,
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })
  })

const copyIfExists = async (from, to) => {
  try {
    await access(from, fsConstants.R_OK)
    await cp(from, to, { recursive: true })
  } catch {
    // optional asset
  }
}

const removePathIfExists = async (path) => {
  await rm(path, { recursive: true, force: true })
}

const rewriteArdCommandsForTempRoot = async (ardsDir) => {
  const entries = await readdir(ardsDir)
  for (const entry of entries) {
    if (!entry.endsWith(".ard.yaml")) continue
    const path = resolve(ardsDir, entry)
    const content = await readFile(path, "utf8")
    const rewritten = content.replaceAll(
      "node ../../../packages/cli/dist/rta.js",
      `node ${JSON.stringify(cliEntryPath)}`,
    )
    await writeFile(path, rewritten, "utf8")
  }
}

const writeTempTsconfig = async (tempRoot) => {
  const config = {
    extends: resolve(root, "tsconfig.json"),
    compilerOptions: {
      noEmit: true,
      baseUrl: ".",
      paths: {
        "@rta/core": [resolve(root, "packages/core/dist/index.d.ts")],
        "@rta/strict": [resolve(root, "packages/strict/dist/index.d.ts")],
        "@rta/vocab": [resolve(root, "packages/vocab/dist/index.d.ts")],
        effect: [resolve(root, "packages/cli/node_modules/effect/dist/dts/index.d.ts")],
      },
    },
    include: [
      "src/**/*.ts",
      "generated/*.ts",
      "generated/*/commands.ts",
      "generated/*/events.ts",
      "generated/*/queries.ts",
      "generated/*/*Handler.ts",
    ],
  }

  await writeFile(
    resolve(tempRoot, "tsconfig.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  )
}

const main = async () => {
  const tempRoot = await mkdtemp(resolve(tmpdir(), "rta-sample-app-"))

  try {
    const initResult = await run(
      "init",
      "node",
      [cliEntryPath, "init", "--root", tempRoot],
      root,
    )
    assert(initResult.code === 0, `init failed:\n${initResult.stderr || initResult.stdout}`)

    // Replace scaffolded example files with the curated sample app contents.
    await removePathIfExists(resolve(tempRoot, "vocab"))
    await removePathIfExists(resolve(tempRoot, "ards"))
    await removePathIfExists(resolve(tempRoot, "generated"))

    await cp(resolve(fixtureRoot, "vocab"), resolve(tempRoot, "vocab"), { recursive: true })
    await cp(resolve(fixtureRoot, "ards"), resolve(tempRoot, "ards"), { recursive: true })
    await cp(resolve(fixtureRoot, "src"), resolve(tempRoot, "src"), { recursive: true })
    await cp(resolve(fixtureRoot, "test"), resolve(tempRoot, "test"), { recursive: true })
    await cp(resolve(fixtureRoot, "package.json"), resolve(tempRoot, "package.json"))
    await copyIfExists(resolve(fixtureRoot, "patterns"), resolve(tempRoot, "patterns"))
    await copyIfExists(resolve(fixtureRoot, "archetypes"), resolve(tempRoot, "archetypes"))
    await rewriteArdCommandsForTempRoot(resolve(tempRoot, "ards"))
    await writeTempTsconfig(tempRoot)

    const commandMatrix = [
      ["context", ["context", "--root", tempRoot]],
      ["generate", ["generate", "--strict", "--root", tempRoot, "--out", resolve(tempRoot, "generated")]],
      ["lint", ["lint", "--root", tempRoot]],
      ["coverage rules", ["coverage", "--kind", "rules", "--root", tempRoot]],
      ["coverage decisions", ["coverage", "--kind", "decisions", "--root", tempRoot]],
      ["coverage reactions", ["coverage", "--kind", "reactions", "--root", tempRoot]],
      ["coverage pm", ["coverage", "--kind", "pm", "--root", tempRoot]],
      ["test-policy", ["test-policy", "--root", tempRoot]],
      ["check ard-meta", ["check", "--ard-meta", "--root", tempRoot]],
      ["check generated-sync", ["check", "--generated-sync", "--root", tempRoot]],
      ["check telemetry-sync", ["check", "--telemetry-sync", "--root", tempRoot]],
      ["check decision-shapes", ["check", "--decision-shapes", "--root", tempRoot]],
      ["check rule-shapes", ["check", "--rule-shapes", "--root", tempRoot]],
      ["check obligation-coverage", ["check", "--obligation-coverage", "--root", tempRoot]],
      ["check execution-telemetry", ["check", "--execution-telemetry", "--root", tempRoot]],
      ["check operation-event", ["check", "--operation-event", "--root", tempRoot]],
      ["check primitive-boundaries", ["check", "--primitive-boundaries", "--root", tempRoot]],
      ["check production", ["check", "--production", "--root", tempRoot]],
      ["check", ["check", "--root", tempRoot]],
      ["check pattern-specs", ["check", "--pattern-specs", "--root", tempRoot]],
      ["check pattern-contracts", ["check", "--pattern-contracts", "--root", tempRoot]],
      ["check archetype-specs", ["check", "--archetype-specs", "--root", tempRoot]],
      ["check archetype-bindings", ["check", "--archetype-bindings", "--root", tempRoot]],
    ]

    for (const [label, args] of commandMatrix) {
      const result = await run(label, "node", [cliEntryPath, ...args], root)
      assert(result.code === 0, `${label} failed:\n${result.stderr || result.stdout}`)
      console.log(`✓ ${label}`)
    }

    const generatedContexts = await readdir(resolve(tempRoot, "generated"))
    assert(generatedContexts.length > 0, "generate did not produce any output")
    const registry = await readFile(resolve(tempRoot, "generated", "registry.ts"), "utf8")
    assert(registry.includes("export const dispatch = ("), "generated registry missing dispatch")
    assert(registry.includes("export const dispatchCommand = ("), "generated registry missing dispatchCommand")
    assert(registry.includes("export const dispatchQuery = ("), "generated registry missing dispatchQuery")
    assert(registry.includes("export const dispatchEvent = ("), "generated registry missing dispatchEvent")
    assert(registry.includes('kind: "event" as const'), "generated registry missing event handler entries")
    const generatedTestContexts = await readdir(resolve(tempRoot, "generated-tests"))
    assert(generatedTestContexts.length > 0, "generate did not produce any generated obligation test stubs")

    const typecheck = await run(
      "typecheck",
      "pnpm",
      ["--filter", "@rta/cli", "exec", "tsc", "--noEmit", "-p", resolve(tempRoot, "tsconfig.json")],
      root,
    )
    assert(typecheck.code === 0, `typecheck failed:\n${typecheck.stderr || typecheck.stdout}`)
    console.log("✓ typecheck")

    const generatedAppRoot = resolve(tempRoot, "generated-authoring-app")
    const generatedApp = await run(
      "generate app scaffold",
      "node",
      [cliEntryPath, "generate", "app", "--name", "Smoke Flow", "--out", generatedAppRoot],
      root,
    )
    assert(generatedApp.code === 0, `generate app scaffold failed:\n${generatedApp.stderr || generatedApp.stdout}`)
    console.log("✓ generate app scaffold")

    const installGeneratedApp = await run(
      "generated app install",
      "pnpm",
      ["install", "--ignore-scripts"],
      generatedAppRoot,
    )
    assert(
      installGeneratedApp.code === 0,
      `generated app install failed:\n${installGeneratedApp.stderr || installGeneratedApp.stdout}`,
    )
    console.log("✓ generated app install")

    const generateGeneratedApp = await run(
      "generated app generate",
      "pnpm",
      ["generate"],
      generatedAppRoot,
    )
    assert(
      generateGeneratedApp.code === 0,
      `generated app generate failed:\n${generateGeneratedApp.stderr || generateGeneratedApp.stdout}`,
    )
    console.log("✓ generated app generate")

    const buildGeneratedApp = await run(
      "generated app cli build",
      "pnpm",
      ["app:build"],
      generatedAppRoot,
    )
    assert(
      buildGeneratedApp.code === 0,
      `generated app cli build failed:\n${buildGeneratedApp.stderr || buildGeneratedApp.stdout}`,
    )
    console.log("✓ generated app cli build")

    const watchGeneratedApp = await run(
      "generated app watch",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "watch", "--trace"],
      generatedAppRoot,
    )
    assert(
      watchGeneratedApp.code === 0,
      `generated app watch failed:\n${watchGeneratedApp.stderr || watchGeneratedApp.stdout}`,
    )
    assert(
      watchGeneratedApp.stdout.includes("Completed command") &&
        watchGeneratedApp.stdout.includes("primitive=command-handler"),
      `generated app watch did not print primitive operation logs:\n${watchGeneratedApp.stdout}`,
    )
    const runMatch = watchGeneratedApp.stdout.match(/^run=(.+)$/m)
    assert(runMatch, `generated app watch did not print a run id:\n${watchGeneratedApp.stdout}`)
    const runId = runMatch[1]
    console.log("✓ generated app watch")

    const statusGeneratedApp = await run(
      "generated app status",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "status"],
      generatedAppRoot,
    )
    assert(
      statusGeneratedApp.code === 0 && statusGeneratedApp.stdout.includes(runId),
      `generated app status failed:\n${statusGeneratedApp.stderr || statusGeneratedApp.stdout}`,
    )
    console.log("✓ generated app status")

    const logsGeneratedApp = await run(
      "generated app logs",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "logs", "tail", "--run", runId],
      generatedAppRoot,
    )
    assert(
      logsGeneratedApp.code === 0 && logsGeneratedApp.stdout.includes("Completed command"),
      `generated app logs failed:\n${logsGeneratedApp.stderr || logsGeneratedApp.stdout}`,
    )
    console.log("✓ generated app logs")

    const graphGeneratedApp = await run(
      "generated app graph",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "graph", "run", "--run", runId],
      generatedAppRoot,
    )
    assert(
      graphGeneratedApp.code === 0 && graphGeneratedApp.stdout.includes('"nodes"'),
      `generated app graph failed:\n${graphGeneratedApp.stderr || graphGeneratedApp.stdout}`,
    )
    console.log("✓ generated app graph")

    const reviewGeneratedApp = await run(
      "generated app review",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "review", "create", "--run", runId],
      generatedAppRoot,
    )
    assert(
      reviewGeneratedApp.code === 0 && reviewGeneratedApp.stdout.includes('"status": "pending"'),
      `generated app review failed:\n${reviewGeneratedApp.stderr || reviewGeneratedApp.stdout}`,
    )
    const review = JSON.parse(reviewGeneratedApp.stdout)
    const approveGeneratedApp = await run(
      "generated app review approve",
      "node",
      [resolve(generatedAppRoot, "dist", "app-cli.js"), "review", "approve", review.id, "--actor", "qa"],
      generatedAppRoot,
    )
    assert(
      approveGeneratedApp.code === 0 && approveGeneratedApp.stdout.includes('"status": "approved"'),
      `generated app review approve failed:\n${approveGeneratedApp.stderr || approveGeneratedApp.stdout}`,
    )
    console.log("✓ generated app review")
    console.log(`✓ sample app loop passed in ${tempRoot}`)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`)
  process.exit(1)
})
