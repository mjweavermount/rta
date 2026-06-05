import type { BoundedContextDeclaration, ConnectionsDeclaration } from "@rta/vocab"

// ---------------------------------------------------------------------------
// Compact, agent-readable project state formatter
// ---------------------------------------------------------------------------

const indent = (n: number, s: string) => " ".repeat(n) + s

const formatPatternTag = (pattern: string | undefined): string =>
  pattern ? ` [${pattern}]` : ""

const formatContext = (ctx: BoundedContextDeclaration): string => {
  const lines: string[] = []
  lines.push(`${ctx.name}  [${ctx.classification}]`)

  if (ctx.aggregates && ctx.aggregates.length > 0) {
    for (const agg of ctx.aggregates) {
      lines.push(indent(2, `${agg.name}`))
      const commands = agg.commands?.map((c) => c.name).join(", ")
      const events = agg.events?.map((e) => e.name).join(", ")
      if (commands) lines.push(indent(4, `commands:  ${commands}`))
      if (events) lines.push(indent(4, `events:    ${events}`))
      if (agg.rules && agg.rules.length > 0) {
        for (const r of agg.rules) {
          lines.push(indent(4, `rule:      ${r.name}${formatPatternTag(r.pattern)}  → ${r.violation}`))
        }
      }
      if (agg.decisions && agg.decisions.length > 0) {
        for (const d of agg.decisions) {
          lines.push(indent(4, `decision:  ${d.name}${formatPatternTag(d.pattern)}  → [${d.outcomes.join(", ")}]`))
        }
      }
    }
  }

  if (ctx.decisions && ctx.decisions.length > 0) {
    for (const d of ctx.decisions) {
      lines.push(indent(2, `decision:  ${d.name}${formatPatternTag(d.pattern)}  → [${d.outcomes.join(", ")}]`))
    }
  }

  if (ctx.queries && ctx.queries.length > 0) {
    const qs = ctx.queries.map((q) => `${q.name} → ${q.returns}`).join(", ")
    lines.push(indent(2, `queries:   ${qs}`))
  }

  return lines.join("\n")
}

const formatConnections = (
  conn: ConnectionsDeclaration,
  _contexts: ReadonlyArray<BoundedContextDeclaration>,
): string => {
  const lines: string[] = []
  if (conn.publishes && conn.publishes.length > 0) {
    for (const p of conn.publishes) {
      lines.push(indent(2, `publishes  ${p.event}  → [${p.to.join(", ")}]`))
    }
  }
  if (conn.subscribes && conn.subscribes.length > 0) {
    for (const s of conn.subscribes) {
      lines.push(indent(2, `subscribes ${s.event}  ← ${s.from}`))
    }
  }
  if (conn.reactions && conn.reactions.length > 0) {
    for (const r of conn.reactions) {
      const emits = r.emits.map((e) => `${e.command} → ${e.to}`).join(", ")
      lines.push(indent(2, `reaction   ${r.name}  on ${r.trigger.event}  emits [${emits}]`))
    }
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export interface VocabSnapshot {
  readonly contexts: ReadonlyArray<BoundedContextDeclaration>
  readonly connections: ReadonlyArray<ConnectionsDeclaration>
  readonly ardCount: number
  readonly root: string
}

export const formatSnapshot = (snap: VocabSnapshot): string => {
  const lines: string[] = []
  lines.push(`Ṛta Context — ${snap.root}`, "")

  if (snap.contexts.length === 0) {
    lines.push("No bounded contexts defined yet.")
    lines.push(`Run \`rta init\` to scaffold a project, then add context YAML files.`)
  } else {
    lines.push(`Bounded Contexts (${snap.contexts.length})`)
    lines.push("─".repeat(50))
    for (const ctx of snap.contexts) {
      lines.push(formatContext(ctx))

      const conn = snap.connections.find((c) => c.context === ctx.name)
      if (conn) {
        const connStr = formatConnections(conn, snap.contexts)
        if (connStr) {
          lines.push(indent(2, "connections:"))
          lines.push(connStr)
        }
      }
      lines.push("")
    }
  }

  if (snap.ardCount > 0) {
    lines.push(`ARDs: ${snap.ardCount} file${snap.ardCount === 1 ? "" : "s"} — run \`rta check\` for status`)
  } else {
    lines.push("ARDs: none defined — add *.ard.yaml files to enforce architecture")
  }

  return lines.join("\n")
}
