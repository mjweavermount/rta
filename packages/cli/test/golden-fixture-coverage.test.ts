import { describe, it, expect } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import {
  CLI_COMMANDS,
  GOLDEN_FIXTURE_REQUIRED_COMMANDS,
  COVERAGE_KINDS,
  GOLDEN_FIXTURE_REQUIRED_CHECK_MODES,
} from "../src/cli-inventory.js"

const repoRoot = resolve(__dirname, "../../..")
const manifestPath = resolve(repoRoot, "fixtures/golden/golden-fixture.manifest.json")

describe("golden fixture coverage", () => {
  it("keeps the fixture manifest aligned with the CLI inventory", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      required_cli_commands: string[]
      required_coverage_kinds: string[]
      required_check_modes: string[]
    }

    expect(manifest.required_cli_commands).toEqual([...GOLDEN_FIXTURE_REQUIRED_COMMANDS])
    expect(manifest.required_coverage_kinds).toEqual([...COVERAGE_KINDS])
    expect(manifest.required_check_modes).toEqual([...GOLDEN_FIXTURE_REQUIRED_CHECK_MODES])

    for (const command of manifest.required_cli_commands) {
      expect(CLI_COMMANDS).toContain(command)
    }
  })
})
