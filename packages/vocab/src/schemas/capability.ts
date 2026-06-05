import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

// ---------------------------------------------------------------------------
// Runtime capability vocabulary
//
// These are not concrete app leaves. They describe the kind of external
// capability an app can bind at runtime while keeping the specific mount,
// endpoint, token path, and deployment choice in app config.
// ---------------------------------------------------------------------------

export const RuntimeCapabilityKind = Schema.Literal(
  "vault-secret-backend",
  "file-secret-backend",
  "in-memory-secret-backend",
  "http-client",
  "graphql-client",
  "mcp-transport",
  "hosting-adapter",
)
export type RuntimeCapabilityKind = typeof RuntimeCapabilityKind.Type

export const RuntimeCapabilityDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  kind: RuntimeCapabilityKind,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  providedBy: Schema.optional(Schema.NonEmptyString),
  configFields: Schema.optional(Schema.Array(FieldDeclaration)),
  secretFields: Schema.optional(Schema.Array(FieldDeclaration)),
  appBindings: Schema.optional(Schema.Array(Schema.NonEmptyString)),
})
export type RuntimeCapabilityDeclaration = typeof RuntimeCapabilityDeclaration.Type

// ---------------------------------------------------------------------------
// Governed tool surfaces
//
// A tool surface is a boundary where an agent, UI, CLI, webhook, or MCP client
// can invoke application capabilities. It blooms from inbound-adapter,
// edge-boundary, policy, secret, and outbound-adapter primitives.
// ---------------------------------------------------------------------------

export const ToolSurfaceProtocol = Schema.Literal("cli", "http", "graphql", "mcp", "webhook")
export type ToolSurfaceProtocol = typeof ToolSurfaceProtocol.Type

export const ToolSafetyClass = Schema.Literal(
  "read",
  "write",
  "destructive",
  "admin",
  "fail-closed",
)
export type ToolSafetyClass = typeof ToolSafetyClass.Type

export const CredentialMode = Schema.Literal(
  "none",
  "user-required",
  "user-preferred",
  "shared-only",
)
export type CredentialMode = typeof CredentialMode.Type

export const ToolDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  input: Schema.optional(Schema.Array(FieldDeclaration)),
  returns: Schema.optional(Schema.NonEmptyString),
  operation: Schema.optional(Schema.NonEmptyString),
  safety: ToolSafetyClass,
  credentialMode: CredentialMode,
  runtimeCapabilities: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  policy: Schema.optional(Schema.NonEmptyString),
  http: Schema.optional(Schema.NonEmptyString),
  failClosedReason: Schema.optional(Schema.NonEmptyString),
})
export type ToolDeclaration = typeof ToolDeclaration.Type

export const ToolSurfaceDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  service: Schema.NonEmptyString,
  protocol: ToolSurfaceProtocol,
  runtimeCapabilities: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  policy: Schema.optional(Schema.NonEmptyString),
  tools: Schema.NonEmptyArray(ToolDeclaration),
})
export type ToolSurfaceDeclaration = typeof ToolSurfaceDeclaration.Type
