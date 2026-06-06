import type { ArdDeclaration } from "./schema.js"

export interface ArdMetaIssue {
  readonly ardId?: string
  readonly message: string
}

const FAMILY_PREFIX: Record<string, string | null> = {
  ci: "CI",
  t1: "T1",
  t2: "T2",
  t3: "T3",
  fixture: null,
  custom: null,
  app: null,
  extensions: null,
  review: null,
  runtime: null,
  trace: null,
  "ard-system": null,
  "use-cases": null,
}

export const validateArdMetadata = (
  ards: ReadonlyArray<ArdDeclaration>,
): ReadonlyArray<ArdMetaIssue> => {
  const issues: ArdMetaIssue[] = []
  const byId = new Map<string, ArdDeclaration>()

  for (const ard of ards) {
    const existing = byId.get(ard.id)
    if (existing) {
      issues.push({ ardId: ard.id, message: `duplicate ARD id also declared by ${existing.id}` })
      continue
    }
    byId.set(ard.id, ard)

    const enforcement = ard.enforcement ?? []
    const isAccepted = ard.status === undefined || ard.status === "accepted"

    if (ard.kind === "letter" && isAccepted && ard.checks.length === 0 && enforcement.length === 0) {
      issues.push({
        ardId: ard.id,
        message: "accepted letter ARDs must declare at least one check, enforcement item, or waiver",
      })
    }

    if (ard.kind === "spirit" && isAccepted && (!ard.letters || ard.letters.length === 0)) {
      issues.push({ ardId: ard.id, message: "accepted spirit ARDs must declare at least one letter reference" })
    }

    if (ard.kind === "letter" && ard.letters && ard.letters.length > 0) {
      issues.push({ ardId: ard.id, message: "letter ARDs may not declare letters" })
    }

    if (enforcement.some((item) => item.kind === "waiver" && item.reason.trim().length === 0)) {
      issues.push({ ardId: ard.id, message: "waiver enforcement items must declare a reason" })
    }

    const prefix = FAMILY_PREFIX[ard.family] ?? null
    if (prefix && !ard.id.startsWith(`ARD-${prefix}-`)) {
      issues.push({
        ardId: ard.id,
        message: `family "${ard.family}" expects ids prefixed with ARD-${prefix}-`,
      })
    }
  }

  for (const ard of ards) {
    if (ard.kind === "spirit") {
      for (const letterId of ard.letters ?? []) {
        const letter = byId.get(letterId)
        if (!letter) {
          issues.push({ ardId: ard.id, message: `references missing letter "${letterId}"` })
          continue
        }
        if (letter.kind !== "letter") {
          issues.push({ ardId: ard.id, message: `references "${letterId}" but it is not a letter ARD` })
          continue
        }
        if (!letter.spirit.includes(ard.id)) {
          issues.push({
            ardId: ard.id,
            message: `letter "${letterId}" does not reciprocally reference spirit "${ard.id}"`,
          })
        }
      }
    }

    if (ard.kind === "letter") {
      const internalSpiritIds = ard.spirit.filter((ref) => byId.has(ref))
      if (internalSpiritIds.length === 0) {
        issues.push({
          ardId: ard.id,
          message: "letter ARDs must reference at least one in-repo spirit ARD id",
        })
      }

      for (const spiritId of internalSpiritIds) {
        const spiritArd = byId.get(spiritId)
        if (!spiritArd) continue
        if (spiritArd.kind !== "spirit") {
          issues.push({
            ardId: ard.id,
            message: `references "${spiritId}" but it is not a spirit ARD`,
          })
          continue
        }
        const spiritLetters: ReadonlyArray<string> = spiritArd.letters ?? []
        if (!spiritLetters.includes(ard.id)) {
          issues.push({
            ardId: ard.id,
            message: `spirit "${spiritId}" does not list letter "${ard.id}"`,
          })
        }
      }
    }
  }

  return issues
}

export const formatArdMetaReport = (
  issues: ReadonlyArray<ArdMetaIssue>,
): string => {
  if (issues.length === 0) {
    return "✓  ARD metadata valid."
  }

  const lines = ["✗  ARD metadata violations:", ""]
  for (const issue of issues) {
    lines.push(`  ${issue.ardId ? `${issue.ardId}: ` : ""}${issue.message}`)
  }
  lines.push("")
  lines.push(`${issues.length} violation${issues.length === 1 ? "" : "s"} → FAIL`)
  return lines.join("\n")
}
