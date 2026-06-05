import { Effect } from "effect"
import { existsSync, readFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { parse } from "yaml"

type Risk = "low" | "medium" | "high"

interface CoverageWaiver {
  readonly id: string
  readonly path: string
  readonly reason: string
  readonly owner: string
  readonly expires: string
  readonly replacementCheck: string
  readonly risk: Risk
}

interface CoverageSummaryMetric {
  readonly total: number
  readonly covered: number
  readonly skipped: number
  readonly pct: number
}

interface CoverageSummaryEntry {
  readonly lines: CoverageSummaryMetric
  readonly statements: CoverageSummaryMetric
  readonly functions: CoverageSummaryMetric
  readonly branches: CoverageSummaryMetric
}

type CoverageSummary = Record<string, CoverageSummaryEntry>

const waiverPath = (root: string): string => join(root, "testing", "coverage-waivers.yaml")
const summaryPath = (root: string): string => join(root, "coverage", "coverage-summary.json")

const requiredFields: ReadonlyArray<keyof CoverageWaiver> = [
  "id",
  "path",
  "reason",
  "owner",
  "expires",
  "replacementCheck",
  "risk",
]

const risks = new Set<Risk>(["low", "medium", "high"])

const normalizePath = (root: string, filePath: string): string =>
  relative(root, resolve(root, filePath)).replaceAll("\\", "/")

const parseWaivers = (root: string, errors: string[]): CoverageWaiver[] => {
  const path = waiverPath(root)
  if (!existsSync(path)) return []

  const raw = parse(readFileSync(path, "utf8")) as unknown
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { waivers?: unknown }).waivers)
      ? (raw as { waivers: unknown[] }).waivers
      : null

  if (!items) {
    errors.push("testing/coverage-waivers.yaml must be a YAML list or { waivers: [...] }")
    return []
  }

  const waivers: CoverageWaiver[] = []
  const ids = new Set<string>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== "object") {
      errors.push(`coverage waiver at index ${index} must be an object`)
      continue
    }
    const record = item as Partial<Record<keyof CoverageWaiver, unknown>>
    const label = typeof record.id === "string" ? record.id : `index ${index}`

    for (const field of requiredFields) {
      if (typeof record[field] !== "string" || record[field].trim().length === 0) {
        errors.push(`${label}: missing ${field}`)
      }
    }

    if (typeof record.id === "string") {
      if (ids.has(record.id)) errors.push(`${record.id}: duplicate waiver id`)
      ids.add(record.id)
    }

    if (typeof record.risk === "string" && !risks.has(record.risk as Risk)) {
      errors.push(`${label}: risk must be low, medium, or high`)
    }

    if (typeof record.path === "string" && !existsSync(resolve(root, record.path))) {
      errors.push(`${label}: path does not exist: ${record.path}`)
    }

    if (typeof record.expires === "string") {
      const expires = new Date(`${record.expires}T00:00:00`)
      if (Number.isNaN(expires.valueOf())) {
        errors.push(`${label}: expires must be YYYY-MM-DD`)
      } else if (expires < today) {
        errors.push(`${label}: waiver expired on ${record.expires}`)
      }
    }

    if (requiredFields.every((field) => typeof record[field] === "string")) {
      waivers.push(record as unknown as CoverageWaiver)
    }
  }

  return waivers
}

const parseSummary = (root: string, errors: string[]): CoverageSummary | null => {
  const path = summaryPath(root)
  if (!existsSync(path)) return null

  try {
    return JSON.parse(readFileSync(path, "utf8")) as CoverageSummary
  } catch (cause) {
    errors.push(`coverage/coverage-summary.json could not be parsed: ${String(cause)}`)
    return null
  }
}

const metricNames = ["lines", "statements", "functions", "branches"] as const

export const checkCoverageWaivers = (root = process.cwd()): Effect.Effect<ReadonlyArray<string>> =>
  Effect.sync(() => {
    const cwd = resolve(root)
    const errors: string[] = []
    const waivers = parseWaivers(cwd, errors)
    const summary = parseSummary(cwd, errors)
    const waivedPaths = new Set(waivers.map((waiver) => normalizePath(cwd, waiver.path)))

    if (!summary) {
      if (waivers.length === 0) {
        errors.push("coverage summary missing and no coverage waivers declared")
      }
      return errors
    }

    for (const [path, entry] of Object.entries(summary)) {
      if (path === "total") continue
      const rel = normalizePath(cwd, path)
      if (rel.startsWith("generated/") || rel.includes("/generated/")) continue
      if (waivedPaths.has(rel)) continue

      for (const metric of metricNames) {
        const pct = entry[metric]?.pct
        if (pct !== 100) {
          errors.push(`${rel}: ${metric} coverage is ${pct}; requires 100% or a coverage waiver`)
        }
      }
    }

    return errors
  })

export const runCoverageWaiverCheck = (root = process.cwd()): Effect.Effect<number> =>
  checkCoverageWaivers(root).pipe(
    Effect.map((errors) => {
      if (errors.length > 0) {
        console.error("Coverage waiver check failed:")
        for (const error of errors) console.error(`- ${error}`)
        return 1
      }
      console.log("Coverage waiver check passed.")
      return 0
    }),
  )
