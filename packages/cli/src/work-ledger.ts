import { readdirSync, readFileSync, statSync } from "node:fs"
import { basename, join } from "node:path"

const ledgerKinds = new Map([
  ["capabilities", "Capability"],
  ["features", "Feature"],
  ["decisions", "Decision"],
  ["research", "Research"],
  ["upstream-candidates", "UpstreamCandidate"],
] as const)

export interface WorkLedgerItem {
  readonly id?: string
  readonly kind?: string
  readonly name?: string
  readonly status?: string
  readonly why?: string
  readonly ownedBy?: unknown
  readonly demonstratedBy?: unknown
  readonly qaSteps?: unknown
  readonly requires?: unknown
  readonly produces?: unknown
  readonly selfAudit?: unknown
  readonly path: string
  readonly slug: string
  readonly [key: string]: unknown
}

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) return walk(path)
      return path.endsWith(".yaml") || path.endsWith(".yml") ? [path] : []
    })
    .sort()

const parseScalar = (line: string): readonly [string, string] | null => {
  const match = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)
  return match ? [match[1]!, match[2]!] : null
}

export const parseLedgerYaml = (text: string): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  let current: string | null = null
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd()
    if (line.trim() === "" || line.trim().startsWith("#")) continue

    const scalar = parseScalar(line)
    if (scalar) {
      const [key, value] = scalar
      current = key
      out[key] = value.length > 0 ? value : []
      continue
    }

    const listMatch = line.match(/^\s*-\s*(.+)$/)
    if (listMatch && current) {
      if (!Array.isArray(out[current])) out[current] = []
      ;(out[current] as string[]).push(listMatch[1]!)
      continue
    }

    const objectMatch = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.+)$/)
    if (objectMatch && current) {
      if (Array.isArray(out[current])) out[current] = {}
      ;(out[current] as Record<string, string>)[objectMatch[1]!] = objectMatch[2]!
    }
  }
  return out
}

const slugFromFile = (file: string): string =>
  basename(file).replace(/\.(capability|feature|decision|research|upstream)\.ya?ml$/, "")

export const loadWorkLedger = (root: string): ReadonlyArray<WorkLedgerItem> => {
  const workRoot = join(root, "work")
  const items: WorkLedgerItem[] = []
  for (const [dirName, expectedKind] of ledgerKinds.entries()) {
    const dir = join(workRoot, dirName)
    let files: ReadonlyArray<string> = []
    try {
      files = walk(dir)
    } catch {
      continue
    }
    for (const file of files) {
      const data = parseLedgerYaml(readFileSync(file, "utf8"))
      if (!data.kind) data.kind = expectedKind
      items.push({
        ...data,
        path: file,
        slug: slugFromFile(file),
      })
    }
  }
  return items.sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

export const findWorkItem = (root: string, idOrName: string): WorkLedgerItem | undefined =>
  loadWorkLedger(root).find((item) => item.id === idOrName || item.name === idOrName)

export const summarizeWorkItem = (item: WorkLedgerItem) => ({
  id: item.id,
  kind: item.kind,
  name: item.name,
  status: item.status,
  why: item.why,
  ownedBy: item.ownedBy ?? {},
  demonstratedBy: item.demonstratedBy ?? [],
  qaSteps: item.qaSteps ?? [],
  requires: item.requires ?? [],
  produces: item.produces ?? [],
  selfAudit: item.selfAudit ?? [],
})
