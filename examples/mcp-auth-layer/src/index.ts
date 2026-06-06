import { Effect } from "effect"
import { DomainError, type OperationScope } from "@rta/core"
import {
  InstrumentedBoundedContext,
  InstrumentedEdgeBoundary,
  InstrumentedInboundAdapter,
  InstrumentedOutboundAdapter,
  InstrumentedPolicy,
  InstrumentedSecret,
  type OperationSummary,
} from "@rta/strict"

export type McpCredentialMode = "none" | "user-required" | "user-preferred" | "shared-only"
export type McpToolSafety = "read" | "write" | "destructive" | "admin" | "fail-closed"

export interface AuthenticatedActor {
  readonly subject: string
  readonly email: string
  readonly name?: string
  readonly groups: ReadonlyArray<string>
}

export interface RawMcpToolCall {
  readonly service: string
  readonly tool: string
  readonly arguments?: Record<string, unknown>
  readonly actor?: Partial<AuthenticatedActor>
}

export interface NormalizedMcpToolCall {
  readonly service: string
  readonly tool: string
  readonly arguments: Record<string, unknown>
  readonly actor: AuthenticatedActor
}

export interface ToolPolicy {
  readonly safety: McpToolSafety
  readonly credentialMode: McpCredentialMode
  readonly allowedGroups: ReadonlyArray<string>
  readonly failClosedReason?: string
}

export interface CredentialResolution {
  readonly kind: "none" | "user" | "shared"
  readonly tokenRef?: string
}

export interface DownstreamToolReceipt {
  readonly service: string
  readonly tool: string
  readonly status: "forwarded" | "denied" | "fail-closed"
  readonly credentialKind: CredentialResolution["kind"]
  readonly summary: string
}

export interface McpAuthLayerDeps {
  readonly policies: Readonly<Record<string, ToolPolicy>>
  readonly credentials: {
    readonly resolve: (
      actor: AuthenticatedActor,
      service: string,
      mode: McpCredentialMode,
    ) => CredentialResolution | null
  }
  readonly downstream: {
    readonly forward: (
      call: NormalizedMcpToolCall,
      credential: CredentialResolution,
    ) => DownstreamToolReceipt
  }
}

const policyKey = (service: string, tool: string): string => `${service}.${tool}`

export class McpRequestIngress extends InstrumentedInboundAdapter<RawMcpToolCall, RawMcpToolCall> {
  constructor() {
    super("McpRequestIngress", "McpAuthLayer")
  }

  protected summarize(input: RawMcpToolCall): OperationSummary {
    return {
      action: `Receive MCP tool ${input.service}.${input.tool}`,
      reason: "an MCP client requested a governed tool call",
      with: ["MCP transport"],
      input: `${input.service}.${input.tool}`,
      output: "raw tool call",
      lineage: ["primitive:inbound-adapter", "protocol:mcp"],
      boundary: { system: "MCP client", operation: "tools/call", mode: "read" },
    }
  }

  protected execute(input: RawMcpToolCall): Effect.Effect<RawMcpToolCall> {
    return Effect.succeed(input)
  }
}

export class McpToolCallBoundary extends InstrumentedEdgeBoundary<RawMcpToolCall, NormalizedMcpToolCall> {
  constructor() {
    super("McpToolCallBoundary", "McpAuthLayer")
  }

  protected summarize(input: RawMcpToolCall): OperationSummary {
    return {
      action: `Validate MCP tool ${input.service}.${input.tool}`,
      reason: "external MCP input must be decoded, normalized, and tied to Authentik identity",
      with: ["Authentik headers", "MCP arguments"],
      input: `${input.service}.${input.tool}`,
      output: "normalized tool call",
      lineage: ["primitive:edge-boundary", "sanitization:mcp-tool"],
      boundary: { system: "MCP client", operation: "decode-tool-call", mode: "read" },
    }
  }

  protected execute(input: RawMcpToolCall): Effect.Effect<NormalizedMcpToolCall, DomainError> {
    if (!input.service.trim() || !input.tool.trim()) {
      return Effect.fail(new DomainError({ message: "MCP service and tool are required" }))
    }
    if (!input.actor?.subject || !input.actor.email) {
      return Effect.fail(new DomainError({ message: "Authentik actor is required for MCP calls" }))
    }
    return Effect.succeed({
      service: input.service.trim(),
      tool: input.tool.trim(),
      arguments: input.arguments ?? {},
      actor: {
        subject: input.actor.subject,
        email: input.actor.email,
        name: input.actor.name,
        groups: input.actor.groups ?? [],
      },
    })
  }
}

export class ToolPolicyGate extends InstrumentedPolicy<
  { readonly call: NormalizedMcpToolCall; readonly policy?: ToolPolicy },
  ToolPolicy
> {
  constructor() {
    super("ToolPolicyGate", "McpAuthLayer")
  }

  protected summarize(input: { readonly call: NormalizedMcpToolCall; readonly policy?: ToolPolicy }): OperationSummary {
    return {
      action: `Authorize ${input.call.service}.${input.call.tool}`,
      reason: "tool safety and group policy must be decided before credential lookup",
      with: ["ToolPolicy"],
      input: `${input.call.service}.${input.call.tool}`,
      output: "policy decision",
      lineage: ["primitive:policy", "pattern:tool-surface"],
    }
  }

  protected execute(input: { readonly call: NormalizedMcpToolCall; readonly policy?: ToolPolicy }): Effect.Effect<ToolPolicy, DomainError> {
    const policy = input.policy
    if (!policy) return Effect.fail(new DomainError({ message: "Tool is not allowed by policy" }))
    if (policy.safety === "fail-closed") {
      return Effect.fail(new DomainError({
        message: policy.failClosedReason ?? "Tool is fail-closed by policy",
        context: { tool: input.call.tool },
      }))
    }
    if (!policy.allowedGroups.includes("*") && !input.call.actor.groups.some((group) => policy.allowedGroups.includes(group))) {
      return Effect.fail(new DomainError({ message: "Actor is not in an allowed group" }))
    }
    return Effect.succeed(policy)
  }
}

export class CredentialBrokerPrimitive extends InstrumentedSecret<
  { readonly call: NormalizedMcpToolCall; readonly policy: ToolPolicy; readonly deps: McpAuthLayerDeps },
  CredentialResolution
> {
  constructor() {
    super("CredentialBroker", "McpAuthLayer")
  }

  protected summarize(input: { readonly call: NormalizedMcpToolCall; readonly policy: ToolPolicy }): OperationSummary {
    return {
      action: `Resolve ${input.policy.credentialMode} credential for ${input.call.service}`,
      reason: "external service calls need credential custody without exposing secret material",
      with: ["CredentialBackend"],
      input: input.call.service,
      output: "credential reference",
      lineage: ["primitive:secret", "pattern:credential-broker"],
    }
  }

  protected execute(input: { readonly call: NormalizedMcpToolCall; readonly policy: ToolPolicy; readonly deps: McpAuthLayerDeps }): Effect.Effect<CredentialResolution, DomainError> {
    if (input.policy.credentialMode === "none") return Effect.succeed({ kind: "none" })
    const credential = input.deps.credentials.resolve(input.call.actor, input.call.service, input.policy.credentialMode)
    return credential
      ? Effect.succeed(credential)
      : Effect.fail(new DomainError({ message: "Required service credential is missing", context: { service: input.call.service } }))
  }
}

export class DownstreamToolForwarder extends InstrumentedOutboundAdapter<
  { readonly call: NormalizedMcpToolCall; readonly credential: CredentialResolution; readonly deps: McpAuthLayerDeps },
  DownstreamToolReceipt
> {
  constructor() {
    super("DownstreamToolForwarder", "McpAuthLayer")
  }

  protected summarize(input: { readonly call: NormalizedMcpToolCall; readonly credential: CredentialResolution }): OperationSummary {
    return {
      action: `Forward ${input.call.service}.${input.call.tool}`,
      reason: "the authorized MCP tool call should run in the target service app",
      with: [input.call.service],
      input: input.call.tool,
      output: "operation receipt",
      lineage: ["primitive:outbound-adapter", "protocol:mcp"],
      boundary: {
        system: input.call.service,
        operation: input.call.tool,
        mode: input.credential.kind === "none" ? "read" : "committed",
      },
    }
  }

  protected execute(input: { readonly call: NormalizedMcpToolCall; readonly credential: CredentialResolution; readonly deps: McpAuthLayerDeps }): Effect.Effect<DownstreamToolReceipt> {
    return Effect.succeed(input.deps.downstream.forward(input.call, input.credential))
  }
}

export class McpAuthLayerContext extends InstrumentedBoundedContext<
  { readonly raw: RawMcpToolCall; readonly deps: McpAuthLayerDeps },
  DownstreamToolReceipt
> {
  private readonly ingress = new McpRequestIngress()
  private readonly boundary = new McpToolCallBoundary()
  private readonly policy = new ToolPolicyGate()
  private readonly credentials = new CredentialBrokerPrimitive()
  private readonly forwarder = new DownstreamToolForwarder()

  constructor() {
    super("McpAuthLayerContext", "McpAuthLayer")
  }

  protected summarize(input: { readonly raw: RawMcpToolCall }): OperationSummary {
    return {
      action: `Handle MCP tool ${input.raw.service}.${input.raw.tool}`,
      reason: "MCP auth layer owns identity, policy, credential resolution, and downstream routing",
      with: ["InboundAdapter", "EdgeBoundary", "Policy", "Secret", "OutboundAdapter"],
      input: `${input.raw.service}.${input.raw.tool}`,
      output: "downstream operation receipt",
      lineage: ["primitive:bounded-context", "archetype:mcp-gateway"],
    }
  }

  protected execute(input: { readonly raw: RawMcpToolCall; readonly deps: McpAuthLayerDeps }, scope: OperationScope): Effect.Effect<DownstreamToolReceipt, DomainError> {
    return Effect.gen(this, function* () {
      const raw = yield* this.ingress.invoke(input.raw, scope.fork("ingress"))
      const call = yield* this.boundary.invoke(raw, scope.fork("boundary"))
      const policy = yield* this.policy.invoke({
        call,
        policy: input.deps.policies[policyKey(call.service, call.tool)],
      }, scope.fork("policy"))
      const credential = yield* this.credentials.invoke({ call, policy, deps: input.deps }, scope.fork("credential"))
      return yield* this.forwarder.invoke({ call, credential, deps: input.deps }, scope.fork("forward"))
    })
  }
}

export const createFakeMcpAuthDeps = (): McpAuthLayerDeps => ({
  policies: {
    "affine.current_user": {
      safety: "read",
      credentialMode: "user-required",
      allowedGroups: ["lab-users"],
    },
    "affine.doc_update": {
      safety: "fail-closed",
      credentialMode: "user-required",
      allowedGroups: ["lab-users"],
      failClosedReason: "AFFiNE write path is disabled until the RTA AFFiNE MCP app owns it.",
    },
  },
  credentials: {
    resolve: (_actor, service, mode) =>
      mode === "user-required" ? { kind: "user", tokenRef: `vault:user/${service}` } : { kind: "none" },
  },
  downstream: {
    forward: (call, credential) => ({
      service: call.service,
      tool: call.tool,
      status: "forwarded",
      credentialKind: credential.kind,
      summary: `I forwarded ${call.service}.${call.tool} because policy allowed the authenticated actor.`,
    }),
  },
})
