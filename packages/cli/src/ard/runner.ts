import { Effect } from "effect"
import { spawn } from "node:child_process"
import type { ArdDeclaration, CheckDeclaration } from "./schema.js"

// ---------------------------------------------------------------------------
// CheckResult
// ---------------------------------------------------------------------------

export interface CheckResult {
  readonly description: string
  readonly command: string
  readonly passed: boolean
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export interface ArdResult {
  readonly ard: ArdDeclaration
  readonly checkResults: ReadonlyArray<CheckResult>
  readonly passed: boolean
}

// ---------------------------------------------------------------------------
// Run a single shell command via spawn
// ---------------------------------------------------------------------------

const runCommand = (
  description: string,
  command: string,
  cwd: string,
): Effect.Effect<CheckResult> =>
  Effect.async<CheckResult>((resume) => {
    const child = spawn(command, {
      shell: true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on("close", (code) => {
      const exitCode = code ?? 1
      resume(
        Effect.succeed({
          description,
          command,
          passed: exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
        }),
      )
    })

    child.on("error", (err) => {
      resume(
        Effect.succeed({
          description,
          command,
          passed: false,
          stdout: "",
          stderr: err.message,
          exitCode: 1,
        }),
      )
    })
  })

// ---------------------------------------------------------------------------
// Run all checks for one ARD
// ---------------------------------------------------------------------------

export const runArd = (
  ard: ArdDeclaration,
  cwd: string,
): Effect.Effect<ArdResult> =>
  Effect.gen(function* () {
    const checkResults: Array<CheckResult> = []
    for (const check of ard.checks) {
      const result = yield* runCommand(check.description, check.command, cwd)
      checkResults.push(result)
    }
    const passed = checkResults.every((r) => r.passed)
    return { ard, checkResults, passed }
  })

// ---------------------------------------------------------------------------
// Run many ARDs
// ---------------------------------------------------------------------------

export const runArds = (
  ards: ReadonlyArray<ArdDeclaration>,
  cwd: string,
): Effect.Effect<ReadonlyArray<ArdResult>> =>
  Effect.forEach(ards, (ard) => runArd(ard, cwd), { concurrency: 1 })
