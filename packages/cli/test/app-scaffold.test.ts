import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { generateAppScaffold } from "../src/app-scaffold.js"

const run = <A>(effect: Effect.Effect<A, any>) => Effect.runPromise(effect)

describe("generateAppScaffold", () => {
  it("creates a vocab-first RTA app shell", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-app-scaffold-test-"))
    try {
      const outDir = join(root, "meeting-flow")
      const generated = await run(generateAppScaffold({ name: "Meeting Flow", outDir }))

      expect(generated).toBe(outDir)
      const pkg = JSON.parse(await readFile(join(outDir, "package.json"), "utf8"))
      expect(pkg.name).toBe("meeting-flow")
      expect(pkg.scripts.generate).toContain("rta generate --strict")
      expect(pkg.scripts.check).toContain("rta check")
      expect(pkg.scripts["app:run"]).toContain("node dist/app-cli.js run")
      expect(pkg.scripts["app:scenario"]).toContain("node dist/app-cli.js scenario")
      expect(pkg.scripts["app:watch"]).toContain("--trace")
      expect(pkg.dependencies["@rta/cli"]).toContain("file:")
      expect(pkg.dependencies["@rta/core"]).toContain("file:")
      expect(pkg.dependencies["@rta/runtime"]).toContain("file:")
      expect(pkg.pnpm.overrides["@rta/strict"]).toContain("file:")

      const context = await readFile(join(outDir, "vocab", "contexts", "meeting-flow.context.yaml"), "utf8")
      expect(context).toContain("name: MeetingFlow")
      expect(context).toContain("CreateMeetingFlow")

      const main = await readFile(join(outDir, "src", "main.ts"), "utf8")
      expect(main).toContain("dispatchCommand")
      expect(main).toContain("MeetingFlow.CreateMeetingFlow")

      const appCli = await readFile(join(outDir, "src", "app-cli.ts"), "utf8")
      expect(appCli).toContain("createReadableLogBuffer")
      expect(appCli).toContain("FileRuntime")
      expect(appCli).toContain("ReviewQueue")
      expect(appCli).toContain("scenario:${appName}.default")
      expect(appCli).toContain("Object.keys(registry)")
      expect(appCli).toContain("case \"status\"")
      expect(appCli).toContain("case \"doctor\"")
      expect(appCli).toContain("case \"review\"")
      expect(appCli).toContain("case \"logs\"")
      expect(appCli).toContain("case \"graph\"")

      const guide = await readFile(join(outDir, "AGENTS.md"), "utf8")
      expect(guide).toContain("Leaf behavior should extend RTA primitives")
      expect(guide).toContain("pnpm app:watch")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
