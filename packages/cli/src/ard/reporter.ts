import type { ArdResult } from "./runner.js"

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

const PASS = "✓"
const FAIL = "✗"

const indent = (n: number, s: string) =>
  s
    .split("\n")
    .map((line) => " ".repeat(n) + line)
    .join("\n")

export const formatArdResult = (result: ArdResult): string => {
  const { ard, checkResults, passed } = result
  const icon = passed ? PASS : FAIL
  const checkCount = checkResults.length
  const summary = `  ${icon}  ${ard.id}  ${ard.name}  (${checkCount} check${checkCount === 1 ? "" : "s"})`

  if (passed) return summary

  const failedChecks = checkResults.filter((c) => !c.passed)
  const details = failedChecks
    .map((c) => {
      const lines = [`    ${FAIL}  ${c.description}`]
      if (c.stderr) lines.push(indent(8, c.stderr))
      else if (c.stdout) lines.push(indent(8, c.stdout))
      return lines.join("\n")
    })
    .join("\n")

  return `${summary}\n${details}`
}

export const formatReport = (results: ReadonlyArray<ArdResult>): string => {
  const lines = ["Ṛta Architectural Check", ""]
  for (const r of results) {
    lines.push(formatArdResult(r))
  }
  lines.push("")
  const total = results.length
  const failed = results.filter((r) => !r.passed).length
  const passed = total - failed
  lines.push(`  ${passed}/${total} passed`)
  return lines.join("\n")
}

export const hasErrors = (results: ReadonlyArray<ArdResult>): boolean =>
  results.some((r) => !r.passed && r.ard.severity === "error")
