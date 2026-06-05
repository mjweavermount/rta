import { readFile, access, mkdtemp, rm, readdir } from "node:fs/promises"
import { constants as fsConstants } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { spawn } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const manifestPath = resolve(root, "fixtures/golden/golden-fixture.manifest.json")
const passDir = resolve(root, "fixtures/golden/pass")
const failDir = resolve(root, "fixtures/golden/fail")
const cliInventoryPath = resolve(root, "packages/cli/dist/index.js")
const cliEntryPath = resolve(root, "packages/cli/dist/rta.js")

const loadJson = async (path) => JSON.parse(await readFile(path, "utf8"))

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
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

const main = async () => {
  await access(manifestPath, fsConstants.R_OK)
  await access(passDir, fsConstants.R_OK)
  await access(failDir, fsConstants.R_OK)
  await access(cliInventoryPath, fsConstants.R_OK)

  const manifest = await loadJson(manifestPath)
  const cliInventory = await import(cliInventoryPath)

  const cliCommands = [...cliInventory.CLI_COMMANDS]
  const requiredCommands = [...manifest.required_cli_commands]
  const requiredCoverageKinds = [...manifest.required_coverage_kinds]
  const requiredCheckModes = [...(manifest.required_check_modes ?? [])]
  const inventoryRequiredCommands = [...cliInventory.GOLDEN_FIXTURE_REQUIRED_COMMANDS]
  const coverageKinds = [...cliInventory.COVERAGE_KINDS]
  const checkModes = [...cliInventory.CHECK_MODES]
  const inventoryRequiredCheckModes = [...cliInventory.GOLDEN_FIXTURE_REQUIRED_CHECK_MODES]

  assert(Array.isArray(requiredCommands) && requiredCommands.length > 0, "golden fixture manifest must declare required_cli_commands")
  assert(Array.isArray(requiredCoverageKinds) && requiredCoverageKinds.length > 0, "golden fixture manifest must declare required_coverage_kinds")
  assert(Array.isArray(requiredCheckModes) && requiredCheckModes.length > 0, "golden fixture manifest must declare required_check_modes")

  for (const command of requiredCommands) {
    assert(cliCommands.includes(command), `golden fixture requires unknown CLI command: ${command}`)
  }

  for (const kind of requiredCoverageKinds) {
    assert(coverageKinds.includes(kind), `golden fixture requires unknown coverage kind: ${kind}`)
  }

  for (const mode of requiredCheckModes) {
    assert(checkModes.includes(mode), `golden fixture requires unknown check mode: ${mode}`)
  }

  assert(
    JSON.stringify(requiredCommands) === JSON.stringify(inventoryRequiredCommands),
    `golden fixture required_cli_commands drifted from CLI inventory:\nmanifest=${JSON.stringify(requiredCommands)}\ninventory=${JSON.stringify(inventoryRequiredCommands)}`,
  )

  assert(
    JSON.stringify(requiredCoverageKinds) === JSON.stringify(coverageKinds),
    `golden fixture required_coverage_kinds drifted from CLI inventory:\nmanifest=${JSON.stringify(requiredCoverageKinds)}\ninventory=${JSON.stringify(coverageKinds)}`,
  )

  assert(
    JSON.stringify(requiredCheckModes) === JSON.stringify(inventoryRequiredCheckModes),
    `golden fixture required_check_modes drifted from CLI inventory:\nmanifest=${JSON.stringify(requiredCheckModes)}\ninventory=${JSON.stringify(inventoryRequiredCheckModes)}`,
  )

  console.log("✓ golden fixture manifest matches CLI inventory")
  console.log(`  commands: ${requiredCommands.join(", ")}`)
  console.log(`  coverage kinds: ${requiredCoverageKinds.join(", ")}`)
  console.log(`  check modes: ${requiredCheckModes.join(", ")}`)

  const initRoot = await mkdtemp(resolve(tmpdir(), "rta-golden-init-"))
  try {
    const initResult = await run(
      "init smoke",
      "node",
      [cliEntryPath, "init", "--root", initRoot],
      root,
    )
    assert(initResult.code === 0, `init smoke failed:\n${initResult.stderr || initResult.stdout}`)
    await access(resolve(initRoot, "AGENTS.md"), fsConstants.R_OK)
    await access(resolve(initRoot, "vocab/contexts/example.context.yaml"), fsConstants.R_OK)
    await access(resolve(initRoot, "vocab/connections/example.connections.yaml"), fsConstants.R_OK)
    await access(resolve(initRoot, "ards/ARD-001.ard.yaml"), fsConstants.R_OK)
    console.log("✓ init smoke passed")
  } finally {
    await rm(initRoot, { recursive: true, force: true })
  }

  const passChecks = [
    ["context", ["context", "--root", "."]],
    ["generate", ["generate", "--strict", "--root", ".", "--out", "generated"]],
    ["lint", ["lint", "--root", "."]],
    ["coverage rules", ["coverage", "--kind", "rules", "--root", "."]],
    ["coverage decisions", ["coverage", "--kind", "decisions", "--root", "."]],
    ["coverage reactions", ["coverage", "--kind", "reactions", "--root", "."]],
    ["coverage pm", ["coverage", "--kind", "pm", "--root", "."]],
    ["test-policy", ["test-policy", "--root", "."]],
    ["check ard-meta", ["check", "--ard-meta", "--root", "."]],
    ["check generated-sync", ["check", "--generated-sync", "--root", "."]],
    ["check telemetry-sync", ["check", "--telemetry-sync", "--root", "."]],
    ["check decision-shapes", ["check", "--decision-shapes", "--root", "."]],
    ["check rule-shapes", ["check", "--rule-shapes", "--root", "."]],
    ["check obligation-coverage", ["check", "--obligation-coverage", "--root", "."]],
    ["check execution-telemetry", ["check", "--execution-telemetry", "--root", "."]],
    ["check operation-event", ["check", "--operation-event", "--root", "."]],
    ["check primitive-boundaries", ["check", "--primitive-boundaries", "--root", "."]],
    ["check production", ["check", "--production", "--root", "."]],
    ["check", ["check", "--root", "."]],
    ["check pattern-specs", ["check", "--pattern-specs", "--root", "."]],
    ["check pattern-contracts", ["check", "--pattern-contracts", "--root", "."]],
    ["check archetype-specs", ["check", "--archetype-specs", "--root", "."]],
    ["check archetype-bindings", ["check", "--archetype-bindings", "--root", "."]],
  ]

  for (const [label, args] of passChecks) {
    const result = await run(label, "node", [cliEntryPath, ...args], passDir)
    assert(result.code === 0, `${label} failed:\n${result.stderr || result.stdout}`)
    console.log(`✓ ${label}`)
  }

  const generatedTestContexts = await readdir(resolve(passDir, "generated-tests"))
  assert(generatedTestContexts.length > 0, "generate did not produce any generated obligation test stubs")
  console.log("✓ generated obligation tests")

  const typecheck = await run(
    "typecheck",
    "pnpm",
    ["--filter", "@rta/cli", "exec", "tsc", "--noEmit", "-p", resolve(passDir, "tsconfig.json")],
    root,
  )
  assert(typecheck.code === 0, `typecheck failed:\n${typecheck.stderr || typecheck.stdout}`)
  console.log("✓ typecheck")

  const failChecks = [
    {
      label: "lint-missing-metadata",
      cwd: resolve(failDir, "lint-missing-metadata"),
      args: ["lint", "--root", "."],
      expected: "missing",
    },
    {
      label: "reaction-coverage-gap",
      cwd: resolve(failDir, "reaction-coverage-gap"),
      args: ["coverage", "--kind", "reactions", "--root", "."],
      expected: "declared but not implemented",
    },
    {
      label: "invalid-archetype-binding",
      cwd: resolve(failDir, "invalid-archetype-binding"),
      args: ["check", "--archetype-bindings", "--root", "."],
      expected: "not found",
    },
    {
      label: "invalid-ard-metadata",
      cwd: resolve(failDir, "invalid-ard-metadata"),
      args: ["check", "--ard-meta", "--root", "."],
      expected: "in-repo spirit",
    },
    {
      label: "missing-obligation-coverage",
      cwd: resolve(failDir, "missing-obligation-coverage"),
      args: ["check", "--obligation-coverage", "--root", "."],
      expected: "missing obligation",
    },
    {
      label: "missing-execution-telemetry",
      cwd: resolve(failDir, "missing-execution-telemetry"),
      args: ["check", "--execution-telemetry", "--root", "."],
      expected: "missing telemetry expectation",
    },
    {
      label: "missing-operation-event",
      cwd: resolve(failDir, "missing-operation-event"),
      args: ["check", "--operation-event", "--root", "."],
      expected: "missing operation event contract",
    },
    {
      label: "primitive-boundary-violation",
      cwd: resolve(failDir, "primitive-boundary-violation"),
      args: ["check", "--primitive-boundaries", "--root", "."],
      expected: "primitive boundary violation",
    },
    {
      label: "missing-decision-shape",
      cwd: resolve(failDir, "missing-decision-shape"),
      args: ["check", "--decision-shapes", "--root", "."],
      expected: "decision must declare implementation.shape",
    },
    {
      label: "missing-rule-shape",
      cwd: resolve(failDir, "missing-rule-shape"),
      args: ["check", "--rule-shapes", "--root", "."],
      expected: "rule must declare implementation.shape",
    },
    {
      label: "invalid-ard",
      cwd: resolve(failDir, "invalid-ard"),
      args: ["check", "--root", "."],
      expected: "No valid ARD files could be parsed.",
    },
  ]

  for (const failCheck of failChecks) {
    const result = await run(
      failCheck.label,
      "node",
      [cliEntryPath, ...failCheck.args],
      failCheck.cwd,
    )
    const output = `${result.stdout}\n${result.stderr}`
    assert(result.code !== 0, `${failCheck.label} unexpectedly passed`)
    assert(
      output.includes(failCheck.expected),
      `${failCheck.label} failed for the wrong reason:\n${output}`,
    )
    console.log(`✓ ${failCheck.label}`)
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`)
  process.exit(1)
})
