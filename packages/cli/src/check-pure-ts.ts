import { Effect } from "effect"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { promisify } from "node:util"

const execFileP = promisify(execFile)

const SOURCE_JS_RE = /\.(?:mjs|cjs|js)$/

export interface PureTsCheckResult {
  readonly trackedJs: ReadonlyArray<string>
  readonly allowed: ReadonlyArray<string>
  readonly unexpected: ReadonlyArray<string>
  readonly missingAllowed: ReadonlyArray<string>
}

export const checkPureTs = (root = process.cwd()): Effect.Effect<PureTsCheckResult, unknown> =>
  Effect.gen(function* () {
    const cwd = resolve(root)
    const trackedJs = yield* Effect.tryPromise({
      try: async () => {
        const { stdout } = await execFileP("git", ["ls-files", "*.js", "*.mjs", "*.cjs"], { cwd })
        return stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => SOURCE_JS_RE.test(line))
          .filter((line) => existsSync(join(cwd, line)))
          .sort()
      },
      catch: (cause) => cause,
    })
    const allowed = yield* Effect.tryPromise({
      try: async () => {
        const text = await readFile(join(cwd, "docs", "rta-pure-ts-allowlist.txt"), "utf8")
        return text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#"))
          .sort()
      },
      catch: () => [] as string[],
    })
    const allowedSet = new Set(allowed)
    const trackedSet = new Set(trackedJs)
    return {
      trackedJs,
      allowed,
      unexpected: trackedJs.filter((file) => !allowedSet.has(file)),
      missingAllowed: allowed.filter((file) => !trackedSet.has(file)),
    }
  })

export const runPureTsCheck = (root = process.cwd()): Effect.Effect<number, unknown> =>
  checkPureTs(root).pipe(
    Effect.map((result) => {
      if (result.unexpected.length > 0 || result.missingAllowed.length > 0) {
        console.error("Pure TypeScript check failed.")
        if (result.unexpected.length > 0) {
          console.error("Tracked JS/MJS/CJS files not in allowlist:")
          for (const file of result.unexpected) console.error(`- ${file}`)
        }
        if (result.missingAllowed.length > 0) {
          console.error("Allowlist entries no longer tracked; remove them:")
          for (const file of result.missingAllowed) console.error(`- ${file}`)
        }
        return 1
      }
      if (result.allowed.length > 0) {
        console.log(`Pure TypeScript migration in progress: ${result.allowed.length} tracked JS/MJS/CJS files remain allowlisted.`)
        return 0
      }
      console.log("Pure TypeScript check passed: no tracked JS/MJS/CJS source remains.")
      return 0
    }),
  )
