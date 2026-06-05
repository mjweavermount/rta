import { readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Effect } from "effect"
import {
  readVocabFile,
  type DecisionDeclaration,
  type RuleDeclaration,
} from "@rta/vocab"
import { shouldSkipWalkDir } from "./discovery.js"

async function discoverContextFiles(root: string): Promise<string[]> {
  const results: string[] = []
  const walk = async (dir: string) => {
    if (shouldSkipWalkDir(root, dir)) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist") continue
        if (entry.isDirectory()) await walk(join(dir, entry.name))
        else if (entry.name.endsWith(".context.yaml")) results.push(join(dir, entry.name))
      }
    } catch {
      // ignore unreadable directories
    }
  }
  await walk(root)
  return results
}

type ShapeIssue = {
  readonly label: string
  readonly message: string
}

const report = (
  heading: string,
  noun: string,
  issues: ReadonlyArray<ShapeIssue>,
  count: number,
) => {
  if (issues.length === 0) {
    console.log(`✓  ${count} ${noun}${count === 1 ? "" : "s"} declare implementation shapes.`)
    return 0
  }

  console.error(`✗  ${heading}:\n`)
  for (const issue of issues) {
    console.error(`  ${issue.label}: ${issue.message}`)
  }
  console.error()
  console.error(`${issues.length} violation${issues.length === 1 ? "" : "s"} → FAIL`)
  return 1
}

const requireRuleShape = (
  context: string,
  aggregate: string,
  rule: RuleDeclaration,
): ReadonlyArray<ShapeIssue> =>
  rule.implementation?.shape !== undefined
    ? []
    : [
        {
          label: `${context}.${aggregate}.${rule.name}`,
          message: "rule must declare implementation.shape",
        },
      ]

const requireDecisionShape = (
  context: string,
  decision: DecisionDeclaration,
): ReadonlyArray<ShapeIssue> =>
  decision.implementation?.shape !== undefined
    ? []
    : [
        {
          label: `${context}.${decision.name}`,
          message: "decision must declare implementation.shape",
        },
      ]

export async function checkRuleShapes(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverContextFiles(cwd)
  const issues: ShapeIssue[] = []
  let count = 0

  for (const path of paths) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(Effect.orElse(() => Effect.succeed(null))),
    )
    if (parsed === null || parsed.kind !== "BoundedContext") continue

    for (const aggregate of parsed.aggregates ?? []) {
      for (const rule of aggregate.rules ?? []) {
        count += 1
        issues.push(...requireRuleShape(parsed.name, aggregate.name, rule))
      }
    }
  }

  return report("Rule shape violations", "rule", issues, count)
}

export async function checkDecisionShapes(root: string): Promise<number> {
  const cwd = resolve(root)
  const paths = await discoverContextFiles(cwd)
  const issues: ShapeIssue[] = []
  let count = 0

  for (const path of paths) {
    const parsed = await Effect.runPromise(
      readVocabFile(path).pipe(Effect.orElse(() => Effect.succeed(null))),
    )
    if (parsed === null || parsed.kind !== "BoundedContext") continue

    for (const decision of parsed.decisions ?? []) {
      count += 1
      issues.push(...requireDecisionShape(parsed.name, decision))
    }
  }

  return report("Decision shape violations", "decision", issues, count)
}
