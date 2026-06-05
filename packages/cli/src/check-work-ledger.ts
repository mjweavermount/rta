import { Effect } from "effect"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, join, relative, resolve } from "node:path"

const requiredFields = [
  "kind:",
  "id:",
  "name:",
  "status:",
  "why:",
  "ownedBy:",
  "demonstratedBy:",
  "qaSteps:",
  "requires:",
  "produces:",
] as const

const allowedKinds = new Set(["Capability", "Feature", "Decision", "Research", "UpstreamCandidate"])
const allowedStatuses = new Set([
  "planned",
  "in-progress",
  "blocked",
  "demo-covered",
  "accepted",
  "superseded",
])

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) return walk(path)
      return path.endsWith(".yaml") || path.endsWith(".yml") ? [path] : []
    })
    .sort()

const hasListItemAfter = (text: string, field: string): boolean => {
  const lines = text.split("\n")
  const fieldIndex = lines.findIndex((line) => line.trim() === field)
  if (fieldIndex === -1) return false

  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    if (/^[a-zA-Z][a-zA-Z0-9]*:/.test(line)) return false
    if (line.trim().startsWith("- ")) return true
    if (/^\s+[a-zA-Z][a-zA-Z0-9]*:/.test(line)) return true
  }

  return false
}

const scalarValue = (text: string, field: string): string | null => {
  const match = text.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"))
  return match ? match[1]! : null
}

const sectionLines = (text: string, field: string): ReadonlyArray<string> => {
  const lines = text.split("\n")
  const fieldIndex = lines.findIndex((line) => line.trim() === `${field}:`)
  if (fieldIndex === -1) return []

  const section: string[] = []
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    if (/^[a-zA-Z][a-zA-Z0-9]*:/.test(line)) break
    if (line.trim().length > 0) section.push(line)
  }
  return section
}

const demoTargets = (text: string): ReadonlyArray<{ readonly type: string; readonly target: string }> =>
  sectionLines(text, "demonstratedBy")
    .map((line) => line.trim())
    .flatMap((line) => {
      const match = line.match(/^-\s*(doc|artifact):\s*(.+)$/)
      return match ? [{ type: match[1]!, target: match[2]! }] : []
    })

const hasQaStep = (text: string, kind: string): boolean =>
  sectionLines(text, "qaSteps").some((line) => line.trim().startsWith(`- ${kind}:`))

export const checkWorkLedger = (root = process.cwd()): Effect.Effect<ReadonlyArray<string>> =>
  Effect.sync(() => {
    const cwd = resolve(root)
    const workDir = join(cwd, "work")
    const demoMap = join(cwd, "docs/demos/rta-demo-coverage-map.md")
    const errors: string[] = []

    const files = existsSync(workDir) ? walk(workDir) : []
    if (files.length === 0) {
      errors.push("work ledger has no YAML entries")
    }

    const demoText = existsSync(demoMap) ? readFileSync(demoMap, "utf8") : ""
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      const rel = relative(cwd, file)

      if (text.includes("*** Begin Patch") || text.includes("*** Add File:") || text.includes("*** End Patch")) {
        errors.push(`${rel} contains patch marker text`)
      }

      for (const field of requiredFields) {
        if (!text.includes(field)) {
          errors.push(`${rel} is missing ${field}`)
        }
      }

      const kind = scalarValue(text, "kind")
      if (kind && !allowedKinds.has(kind)) {
        errors.push(`${rel} has unsupported kind ${kind}`)
      }

      const id = scalarValue(text, "id")
      if (id) {
        const expectedStem = basename(file).replace(/\.(capability|feature|decision|research|upstream)\.ya?ml$/, "")
        if (id !== expectedStem) {
          errors.push(`${rel} id ${id} does not match filename stem ${expectedStem}`)
        }
      }

      const status = scalarValue(text, "status")
      if (status && !allowedStatuses.has(status)) {
        errors.push(`${rel} has unsupported status ${status}`)
      }

      if (!hasListItemAfter(text, "ownedBy:")) {
        errors.push(`${rel} must declare at least one ownedBy item; external systems such as Plane are optional`)
      }

      if (!hasListItemAfter(text, "demonstratedBy:")) {
        errors.push(`${rel} must declare at least one demonstratedBy item`)
      }

      if (!hasQaStep(text, "do")) {
        errors.push(`${rel} qaSteps must include at least one do action`)
      }

      if (!hasQaStep(text, "see")) {
        errors.push(`${rel} qaSteps must include at least one see observation`)
      }

      if (!hasListItemAfter(text, "produces:")) {
        errors.push(`${rel} must declare at least one produced artifact, command, doc, or behavior`)
      }

      const idMatch = text.match(/^id:\s*([A-Za-z0-9_.-]+)/m)
      if (idMatch && !demoText.includes(idMatch[1]!) && !demoText.includes(scalarValue(text, "name") ?? "")) {
        errors.push(`${rel} is not mentioned in the demo coverage map by id or name`)
      }

      for (const demo of demoTargets(text)) {
        if (demo.type === "doc" && !existsSync(join(cwd, demo.target))) {
          errors.push(`${rel} references missing demo doc ${demo.target}`)
        }
      }
    }

    return errors
  })

export const runWorkLedgerCheck = (root = process.cwd()): Effect.Effect<number> =>
  checkWorkLedger(root).pipe(
    Effect.map((errors) => {
      if (errors.length > 0) {
        console.error("Work ledger check failed:")
        for (const error of errors) console.error(`- ${error}`)
        return 1
      }
      const files = existsSync(join(resolve(root), "work")) ? walk(join(resolve(root), "work")) : []
      console.log(`Work ledger check passed for ${files.length} entries.`)
      return 0
    }),
  )
