import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type ToolName =
  | "affine.ping"
  | "affine.current_user"
  | "affine.list_workspaces"
  | "affine.recent_docs"
  | "affine.doc_read"
  | "affine.schema_summary"
  | "affine.doc_update"

export type ReceiptStatus = "completed" | "denied" | "rejected" | "fail-closed"

export interface ToolCall {
  readonly name: ToolName
  readonly input?: Record<string, unknown>
}

export interface OperationReceipt {
  readonly receiptId: string
  readonly runId?: string
  readonly tool: ToolName
  readonly status: ReceiptStatus
  readonly summary: string
  readonly talksTo: ReadonlyArray<string>
  readonly data?: unknown
}

export interface OperationEvent {
  readonly eventId: string
  readonly runId: string
  readonly app: "affine-ops-gateway"
  readonly primitive: "tool-surface"
  readonly operation: ToolName
  readonly status: ReceiptStatus
  readonly summary: string
  readonly timestamp: string
  readonly systems: ReadonlyArray<string>
  readonly ids: {
    readonly receiptId: string
  }
  readonly details?: unknown
}

export interface RunResult {
  readonly runId: string
  readonly runRoot: string
  readonly receipt: OperationReceipt
  readonly event: OperationEvent
}

export interface SecretBackend {
  readonly getSecret: (name: string) => string | null
}

export interface AffineClient {
  readonly ping: () => unknown
  readonly currentUser: (token: string) => unknown
  readonly listWorkspaces: (token: string) => unknown
  readonly recentDocs: (token: string) => unknown
  readonly docRead: (token: string, docId: string) => unknown
  readonly schemaSummary: (token: string) => unknown
}

export class InMemorySecretBackend implements SecretBackend {
  constructor(private readonly secrets: Readonly<Record<string, string>> = {}) {}

  getSecret(name: string): string | null {
    return this.secrets[name] ?? null
  }
}

export class FakeAffineClient implements AffineClient {
  ping(): unknown {
    return { ok: true, service: "affine" }
  }

  currentUser(token: string): unknown {
    return { id: "fake-user", tokenSeen: token.length > 0 }
  }

  listWorkspaces(_token: string): unknown {
    return [{ id: "workspace-1", name: "Agent Workspace" }]
  }

  recentDocs(_token: string): unknown {
    return [{ id: "doc-1", title: "Recent AFFiNE Doc" }]
  }

  docRead(_token: string, docId: string): unknown {
    return { id: docId, title: "Read AFFiNE Doc", markdown: "# Read AFFiNE Doc" }
  }

  schemaSummary(_token: string): unknown {
    return { queries: ["currentUser", "workspacePages"], mutations: ["applyDocUpdates"] }
  }
}

export interface GatewayDeps {
  readonly secrets: SecretBackend
  readonly affine: AffineClient
}

const talksTo = ["SecretBackend", "AffineClient"] as const

const slug = (value: string): string => value.replace(/[^a-zA-Z0-9_.-]+/g, "-")

export const createRunId = (tool: ToolName, now = new Date()): string =>
  `run-${slug(tool)}-${now.toISOString().replace(/[:.]/g, "-")}`

const createReceiptId = (tool: ToolName): string => `receipt-${slug(tool)}`

const receipt = (
  tool: ToolName,
  status: ReceiptStatus,
  summary: string,
  data?: unknown,
): OperationReceipt => ({
  receiptId: createReceiptId(tool),
  tool,
  status,
  summary,
  talksTo,
  ...(data === undefined ? {} : { data }),
})

const requireToken = (deps: GatewayDeps, tool: ToolName): string | OperationReceipt => {
  const token = deps.secrets.getSecret("affine.auth")
  return token ?? receipt(tool, "denied", `I did not run ${tool} because AFFiNE credentials are missing.`)
}

const requireDocId = (input: Record<string, unknown> | undefined): string | null => {
  const value = input?.["docId"]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

export const executeTool = (call: ToolCall, deps: GatewayDeps): OperationReceipt => {
  if (call.name === "affine.ping") {
    return receipt(
      call.name,
      "completed",
      "I ran affine.ping because read-only service health is allowed.",
      deps.affine.ping(),
    )
  }

  if (call.name === "affine.doc_update") {
    return receipt(
      call.name,
      "fail-closed",
      "I refused affine.doc_update because AFFiNE write semantics are not approved yet.",
    )
  }

  const token = requireToken(deps, call.name)
  if (typeof token !== "string") return token

  switch (call.name) {
    case "affine.current_user":
      return receipt(call.name, "completed", "I read the AFFiNE current user because the operator requested identity proof.", deps.affine.currentUser(token))
    case "affine.list_workspaces":
      return receipt(call.name, "completed", "I listed AFFiNE workspaces because the operator requested workspace discovery.", deps.affine.listWorkspaces(token))
    case "affine.recent_docs":
      return receipt(call.name, "completed", "I listed recent AFFiNE docs because the operator requested document discovery.", deps.affine.recentDocs(token))
    case "affine.schema_summary":
      return receipt(call.name, "completed", "I read the AFFiNE schema summary because the operator requested integration shape.", deps.affine.schemaSummary(token))
    case "affine.doc_read": {
      const docId = requireDocId(call.input)
      return docId
        ? receipt(call.name, "completed", `I read AFFiNE doc ${docId} because read-only document inspection is allowed.`, deps.affine.docRead(token, docId))
        : receipt(call.name, "rejected", "I rejected affine.doc_read because input.docId must be a non-empty string.")
    }
  }
}

export const createFakeGatewayDeps = (token = "fake-token"): GatewayDeps => ({
  secrets: new InMemorySecretBackend({ "affine.auth": token }),
  affine: new FakeAffineClient(),
})

export const runTool = (
  call: ToolCall,
  deps: GatewayDeps,
  options: {
    readonly root: string
    readonly runId?: string
    readonly now?: Date
    readonly profile?: string
    readonly trace?: boolean
  },
): RunResult => {
  const now = options.now ?? new Date()
  const runId = options.runId ?? createRunId(call.name, now)
  const runRoot = join(options.root, ".rta", "runs", runId)
  const receiptResult = executeTool(call, deps)
  const fullReceipt: OperationReceipt = { ...receiptResult, runId }
  const event: OperationEvent = {
    eventId: `event-${slug(call.name)}`,
    runId,
    app: "affine-ops-gateway",
    primitive: "tool-surface",
    operation: call.name,
    status: fullReceipt.status,
    summary: fullReceipt.summary,
    timestamp: now.toISOString(),
    systems: fullReceipt.talksTo,
    ids: { receiptId: fullReceipt.receiptId },
    details: {
      profile: options.profile ?? "fake",
      trace: options.trace ?? false,
      input: call.input ?? {},
    },
  }

  mkdirSync(runRoot, { recursive: true })
  writeFileSync(join(runRoot, "state.json"), JSON.stringify({
    runId,
    app: "affine-ops-gateway",
    status: fullReceipt.status === "completed" ? "completed" : "failed",
    tool: call.name,
  }, null, 2))
  appendFileSync(join(runRoot, "readable.log"), `[normal] ${call.name} ${fullReceipt.status} - ${fullReceipt.summary}\n`)
  appendFileSync(join(runRoot, "operation-events.jsonl"), `${JSON.stringify(event)}\n`)
  appendFileSync(join(runRoot, "receipts.jsonl"), `${JSON.stringify(fullReceipt)}\n`)

  return { runId, runRoot, receipt: fullReceipt, event }
}
