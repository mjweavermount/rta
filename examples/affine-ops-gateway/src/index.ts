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
  readonly tool: ToolName
  readonly status: ReceiptStatus
  readonly summary: string
  readonly talksTo: ReadonlyArray<string>
  readonly data?: unknown
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

const receipt = (
  tool: ToolName,
  status: ReceiptStatus,
  summary: string,
  data?: unknown,
): OperationReceipt => ({
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
