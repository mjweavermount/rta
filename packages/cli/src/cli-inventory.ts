export const CLI_COMMANDS = [
  "init",
  "context",
  "check",
  "generate",
  "lint",
  "coverage",
  "test-policy",
  "serve",
] as const

export type CliCommand = (typeof CLI_COMMANDS)[number]

export const GOLDEN_FIXTURE_REQUIRED_COMMANDS = [
  "init",
  "context",
  "check",
  "generate",
  "lint",
  "coverage",
  "test-policy",
] as const

export type GoldenFixtureRequiredCommand =
  (typeof GOLDEN_FIXTURE_REQUIRED_COMMANDS)[number]

export const COVERAGE_KINDS = [
  "rules",
  "decisions",
  "reactions",
  "pm",
] as const

export type CoverageKind = (typeof COVERAGE_KINDS)[number]

export const CHECK_MODES = [
  "ard-meta",
  "ard-enforcement",
  "generated-sync",
  "telemetry-sync",
  "decision-shapes",
  "rule-shapes",
  "obligation-coverage",
  "execution-telemetry",
  "operation-event",
  "primitive-boundaries",
  "production",
  "pattern-specs",
  "pattern-contracts",
  "archetype-specs",
  "archetype-bindings",
  "pure-ts",
  "release-hygiene",
  "work-ledger",
  "demo-coverage",
  "coverage-waivers",
] as const

export type CheckMode = (typeof CHECK_MODES)[number]

export const GOLDEN_FIXTURE_REQUIRED_CHECK_MODES = CHECK_MODES

export type GoldenFixtureRequiredCheckMode =
  (typeof GOLDEN_FIXTURE_REQUIRED_CHECK_MODES)[number]
