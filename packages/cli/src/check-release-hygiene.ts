import { Effect } from "effect"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

export const checkReleaseHygiene = (root = process.cwd()): Effect.Effect<ReadonlyArray<string>> =>
  Effect.sync(() => {
    const cwd = resolve(root)
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"))
    const errors: string[] = []

    if (pkg.private !== false) errors.push("package must be publishable or explicitly marked private=false for release hygiene")
    if (!pkg.name?.startsWith("@mjweavermount/")) errors.push("package name must use @mjweavermount scope")
    if (!pkg.version || pkg.version === "0.0.0") errors.push("package version must be release-shaped")
    if (!pkg.bin?.rta) errors.push("package must expose rta bin")
    if (!pkg.exports?.["."]) errors.push("package must expose root export")
    for (const requiredScript of ["check", "check:production", "check:release", "audit", "doctor"]) {
      if (!pkg.scripts?.[requiredScript]) errors.push(`package missing script ${requiredScript}`)
    }
    for (const requiredFile of ["pnpm-lock.yaml", ".github/workflows/checks.yml", "packages/cli/src/index.ts"]) {
      if (!existsSync(join(cwd, requiredFile))) errors.push(`missing ${requiredFile}`)
    }

    return errors
  })

export const runReleaseHygieneCheck = (root = process.cwd()): Effect.Effect<number> =>
  checkReleaseHygiene(root).pipe(
    Effect.map((errors) => {
      if (errors.length > 0) {
        console.error(errors.map((error) => `- ${error}`).join("\n"))
        return 1
      }
      console.log("Release hygiene passed.")
      return 0
    }),
  )
