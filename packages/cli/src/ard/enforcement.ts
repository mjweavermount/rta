import { CHECK_MODES, CLI_COMMANDS, COVERAGE_KINDS } from "../cli-inventory.js"
import type { ArdDeclaration, EnforcementDeclaration } from "./schema.js"

export interface ArdEnforcementIssue {
  readonly ardId: string
  readonly command?: string
  readonly message: string
}

const cliCommands = new Set<string>(CLI_COMMANDS)
const checkModes = new Set<string>(CHECK_MODES)
const coverageKinds = new Set<string>(COVERAGE_KINDS)

export const validateArdEnforcement = (
  ards: ReadonlyArray<ArdDeclaration>,
): ReadonlyArray<ArdEnforcementIssue> => {
  const issues: ArdEnforcementIssue[] = []

  for (const ard of ards) {
    if (ard.kind !== "letter" || ard.status !== "accepted") continue

    for (const item of ard.enforcement ?? []) {
      if (item.kind !== "command") continue
      issues.push(...validateCommandEnforcement(ard.id, item))
    }
  }

  return issues
}

export const formatArdEnforcementReport = (
  issues: ReadonlyArray<ArdEnforcementIssue>,
): string => {
  if (issues.length === 0) {
    return "✓  ARD enforcement valid."
  }

  const lines = ["✗  ARD enforcement violations:", ""]
  for (const issue of issues) {
    lines.push(`  ${issue.ardId}: ${issue.message}${issue.command ? ` (${issue.command})` : ""}`)
  }
  lines.push("")
  lines.push(`${issues.length} violation${issues.length === 1 ? "" : "s"} → FAIL`)
  return lines.join("\n")
}

const validateCommandEnforcement = (
  ardId: string,
  item: Extract<EnforcementDeclaration, { readonly kind: "command" }>,
): ReadonlyArray<ArdEnforcementIssue> => {
  const segments = item.command.split("&&").map((segment) => segment.trim()).filter(Boolean)
  if (segments.length === 0) {
    return [{ ardId, command: item.command, message: "command enforcement must not be empty" }]
  }

  return segments.flatMap((segment) => validateCommandSegment(ardId, segment))
}

const validateCommandSegment = (
  ardId: string,
  command: string,
): ReadonlyArray<ArdEnforcementIssue> => {
  const tokens = command.split(/\s+/).filter(Boolean)
  const rtaIndex = tokens.findIndex((token) => token === "rta" || token.endsWith("/rta.js"))
  if (rtaIndex < 0) {
    return [{ ardId, command, message: "command enforcement must invoke rta or rta.js" }]
  }

  const rtaArgs = tokens.slice(rtaIndex + 1)
  const subcommand = rtaArgs[0]
  if (!subcommand || !cliCommands.has(subcommand)) {
    return [{ ardId, command, message: `unknown rta command "${subcommand ?? ""}"` }]
  }

  if (subcommand === "check") {
    return validateCheckFlags(ardId, command, rtaArgs.slice(1))
  }

  if (subcommand === "coverage") {
    return validateCoverageFlags(ardId, command, rtaArgs.slice(1))
  }

  return []
}

const validateCheckFlags = (
  ardId: string,
  command: string,
  args: ReadonlyArray<string>,
): ReadonlyArray<ArdEnforcementIssue> => {
  const issues: ArdEnforcementIssue[] = []
  const modes = args
    .filter((arg) => arg.startsWith("--"))
    .filter((arg) => arg !== "--root")
    .map((arg) => arg.slice(2))

  for (const mode of modes) {
    if (!checkModes.has(mode)) {
      issues.push({ ardId, command, message: `unknown rta check mode "--${mode}"` })
    }
  }

  return issues
}

const validateCoverageFlags = (
  ardId: string,
  command: string,
  args: ReadonlyArray<string>,
): ReadonlyArray<ArdEnforcementIssue> => {
  const kindIndex = args.indexOf("--kind")
  if (kindIndex < 0) return []

  const kind = args[kindIndex + 1]
  return kind !== undefined && coverageKinds.has(kind)
    ? []
    : [{ ardId, command, message: `unknown rta coverage kind "${kind ?? ""}"` }]
}
