// ---------------------------------------------------------------------------
// RtaReporter — vitest custom reporter that writes SuiteCapture JSON files
// to .rta-captures/ after every test run.
//
// Usage in vitest.config.ts:
//   import { RtaReporter } from "@rta/scenario/reporter"   // (if re-exported)
//   reporters: ["default", new RtaReporter()]
//
// Or via string reference (requires vitest >= 1.4):
//   reporters: ["default", "@rta/scenario/reporter"]
//
// When RTA_CAPTURES_DIR env var is set, writes there instead of <cwd>/.rta-captures/.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from "node:fs/promises"
import { join, relative } from "node:path"
import type { RunnerTestFile } from "vitest"
import type { SuiteCapture, TestMeta } from "./types.js"

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** Walk a vitest File task tree and collect leaf test results */
function collectTests(file: RunnerTestFile, cwd: string): TestMeta[] {
  const results: TestMeta[] = []

  function walk(task: { name: string; type: string; tasks?: typeof task[]; result?: { state?: string; duration?: number } }, suitePath: string[]) {
    if (task.type === "test" || task.type === "custom") {
      const suite = suitePath.join(" > ")
      const name  = task.name
      const slug  = [...suitePath, task.name].map(slugify).join("/")
      const passed = task.result?.state === "pass"
      const durationMs = task.result?.duration ?? 0
      results.push({ suite, name, slug, passed, durationMs })
    } else if (task.tasks) {
      for (const child of task.tasks) {
        walk(child, task.type === "suite" || task.type === "describe"
          ? [...suitePath, task.name]
          : suitePath)
      }
    }
  }

  // The File task itself is a suite whose name is the file path
  for (const child of file.tasks ?? []) {
    walk(child, [])
  }

  return results
}

type TestModuleLike = {
  filepath?: string
  id?: string
  name?: string
  tasks?: RunnerTestFile["tasks"]
  children?: RunnerTestFile["tasks"]
  task?: RunnerTestFile
}

export class RtaReporter {
  private capturesDir: string

  constructor() {
    this.capturesDir = process.env["RTA_CAPTURES_DIR"] ?? join(process.cwd(), ".rta-captures")
  }

  async onTestRunEnd(testModules: ReadonlyArray<TestModuleLike>): Promise<void> {
    return this.writeCaptures(testModules.map((testModule) => toRunnerFile(testModule)))
  }

  async onFinished(files?: RunnerTestFile[]): Promise<void> {
    return this.writeCaptures(files ?? [])
  }

  private async writeCaptures(files: RunnerTestFile[]): Promise<void> {
    if (files.length === 0) return
    const cwd = process.cwd()

    await mkdir(this.capturesDir, { recursive: true })

    for (const file of files) {
      const tests = collectTests(file, cwd)
      if (tests.length === 0) continue

      const relPath = relative(cwd, file.filepath)
      const capture: SuiteCapture = {
        file: relPath,
        tests,
        capturedAt: new Date().toISOString(),
      }

      // Write as <capturesDir>/<slug-of-file>.json
      const slug = slugify(relPath.replace(/\//g, "-").replace(/\.test\.ts$/, ""))
      await writeFile(
        join(this.capturesDir, `${slug}.json`),
        JSON.stringify(capture, null, 2),
        "utf-8",
      ).catch(() => undefined)
    }
  }
}

function toRunnerFile(testModule: TestModuleLike): RunnerTestFile {
  if (testModule.task) return testModule.task
  return {
    ...testModule,
    filepath: testModule.filepath ?? testModule.id ?? testModule.name ?? "unknown",
    tasks: testModule.tasks ?? testModule.children ?? [],
  } as RunnerTestFile
}

// Default export so vitest can load it by package path
export default RtaReporter
