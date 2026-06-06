import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import {
  explainProjection,
  runLocalProjection,
  statePaths,
  verifyLocalProjection,
} from "../src/local.js"
import { runCli } from "../src/cli.js"

const tempRoots: string[] = []

const tempDir = (): string => {
  const path = mkdtempSync(join(tmpdir(), "rta-markdown-projection-"))
  tempRoots.push(path)
  return path
}

const git = (cwd: string, args: ReadonlyArray<string>): string =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim()

const commitAll = (repo: string, message: string): void => {
  git(repo, ["add", "."])
  git(repo, ["commit", "-m", message])
}

afterEach(() => {
  for (const path of tempRoots.splice(0)) rmSync(path, { recursive: true, force: true })
})

describe("local Markdown projection operator", () => {
  it("applies and verifies a local Git-backed projection", () => {
    const root = tempDir()
    const repo = join(root, "docs")
    const stateRoot = join(root, "state")
    mkdirSync(join(repo, "business"), { recursive: true })
    writeFileSync(join(repo, "business", "plan.md"), "# Business Plan\n\nHello from Git.\n")
    git(repo, ["init"])
    git(repo, ["config", "user.email", "projection@example.test"])
    git(repo, ["config", "user.name", "Projection Test"])
    commitAll(repo, "initial docs")

    const receipt = runLocalProjection({
      sourceRoot: repo,
      sourceId: "collective-docs",
      kind: "shared-git-markdown",
      stateRoot,
    })
    const paths = statePaths(stateRoot, "collective-docs")
    const registry = JSON.parse(readFileSync(paths.registryPath, "utf8")) as { records: Array<{ sourcePath: string }> }
    const verification = verifyLocalProjection({ sourceId: "collective-docs", stateRoot })

    expect(receipt.projected).toHaveLength(1)
    expect(registry.records[0]?.sourcePath).toBe("business/plan.md")
    expect(verification).toMatchObject({
      ok: true,
      projectedDocs: 1,
      missingDocs: [],
      editableDocs: [],
      nonBotOwnedDocs: [],
    })
  })

  it("preserves projection identity after a Git rename", () => {
    const root = tempDir()
    const repo = join(root, "docs")
    const stateRoot = join(root, "state")
    mkdirSync(repo, { recursive: true })
    writeFileSync(join(repo, "business-plan.md"), "# Business Plan\n\nFirst home.\n")
    git(repo, ["init"])
    git(repo, ["config", "user.email", "projection@example.test"])
    git(repo, ["config", "user.name", "Projection Test"])
    commitAll(repo, "initial docs")

    const first = runLocalProjection({
      sourceRoot: repo,
      sourceId: "collective-docs",
      kind: "shared-git-markdown",
      stateRoot,
    })
    mkdirSync(join(repo, "business"))
    git(repo, ["mv", "business-plan.md", "business/plan.md"])
    writeFileSync(join(repo, "business", "plan.md"), "# Business Plan\n\nRenamed home.\n")
    commitAll(repo, "rename business plan")

    const second = runLocalProjection({
      sourceRoot: repo,
      sourceId: "collective-docs",
      kind: "shared-git-markdown",
      stateRoot,
    })
    const explained = explainProjection({
      sourceId: "collective-docs",
      stateRoot,
      sourcePath: "business/plan.md",
    })

    expect(second.projected[0]?.affineDocId).toBe(first.projected[0]?.affineDocId)
    expect(explained).toMatchObject({
      sourcePath: "business/plan.md",
      knownAliases: ["business-plan.md"],
    })
  })

  it("exposes plan, apply, verify, and explain through the CLI runner", () => {
    const root = tempDir()
    const repo = join(root, "docs")
    const stateRoot = join(root, "state")
    mkdirSync(repo, { recursive: true })
    writeFileSync(join(repo, "agenda.md"), "# Agenda\n\n- One\n")

    const output: string[] = []
    const io = { log: (line: string): void => { output.push(line) } }
    const common = ["--source-root", repo, "--source-id", "collective-docs", "--state-root", stateRoot]

    expect(runCli(["plan", ...common], io)).toBe(0)
    expect(output.at(-1)).toContain("agenda.md")
    expect(runCli(["apply", ...common], io)).toBe(0)
    expect(runCli(["verify", ...common], io)).toBe(0)
    expect(runCli(["explain", ...common, "--path", "agenda.md"], io)).toBe(0)
    expect(output.at(-1)).toContain("projection-bot")
  })
})
