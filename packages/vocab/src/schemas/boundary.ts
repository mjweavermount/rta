import { Schema } from "effect"
import { FieldDeclaration } from "./primitives.js"

// ---------------------------------------------------------------------------
// Boundary vocabulary
//
// Ports declare required capabilities. Boundary schemas declare the DTO-ish
// shapes allowed to cross edges. Adapter bindings connect ports to concrete
// adapters for a runtime target. Published languages expose public contracts
// such as OpenAPI/MCP/CLI surfaces without leaking domain internals.
// ---------------------------------------------------------------------------

export const PortDirection = Schema.Literal("inbound", "outbound", "bidirectional")
export type PortDirection = typeof PortDirection.Type

export const PortKind = Schema.Literal(
  "clock",
  "random",
  "repository",
  "queue",
  "artifact-store",
  "run-state-store",
  "secret",
  "http-client",
  "graphql-client",
  "mcp-client",
  "sql",
  "filesystem",
  "publication",
  "hosting",
)
export type PortKind = typeof PortKind.Type

export const PortDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  kind: PortKind,
  direction: PortDirection,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  operations: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  inputSchemas: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  outputSchemas: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  policies: Schema.optional(Schema.Array(Schema.NonEmptyString)),
})
export type PortDeclaration = typeof PortDeclaration.Type

export const BoundarySchemaKind = Schema.Literal(
  "dto",
  "input",
  "output",
  "openapi-component",
  "event-envelope",
  "persistence-record",
)
export type BoundarySchemaKind = typeof BoundarySchemaKind.Type

export const SchemaSource = Schema.Literal("effect-schema", "openapi", "json-schema", "manual")
export type SchemaSource = typeof SchemaSource.Type

export const SanitizationStrategy = Schema.Literal(
  "cli-input",
  "http-json",
  "mcp-tool",
  "file-path",
  "file-payload",
  "sql-row",
  "queue-message",
  "external-api-response",
  "llm-output",
  "secret-material",
  "transcript",
  "openapi-request",
  "custom",
)
export type SanitizationStrategy = typeof SanitizationStrategy.Type

export const SanitizationDeclaration = Schema.Struct({
  required: Schema.Boolean,
  strategy: SanitizationStrategy,
  produces: Schema.optional(Schema.Literal("sanitized", "internal")),
  redacts: Schema.optional(Schema.Array(Schema.NonEmptyString)),
})
export type SanitizationDeclaration = typeof SanitizationDeclaration.Type

export const BoundarySchemaDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  kind: BoundarySchemaKind,
  description: Schema.optional(Schema.NonEmptyString),
  source: SchemaSource,
  fields: Schema.optional(Schema.Array(FieldDeclaration)),
  mapsTo: Schema.optional(Schema.NonEmptyString),
  validation: Schema.Struct({
    required: Schema.Boolean,
    strategy: Schema.Literal("decode", "parse", "validate-only"),
  }),
  sanitization: SanitizationDeclaration,
  openapiRef: Schema.optional(Schema.NonEmptyString),
})
export type BoundarySchemaDeclaration = typeof BoundarySchemaDeclaration.Type

export const BoundaryPipelineDeclaration = Schema.Struct({
  inputSchema: Schema.NonEmptyString,
  outputSchema: Schema.optional(Schema.NonEmptyString),
  decode: Schema.Boolean,
  sanitize: Schema.Boolean,
  normalize: Schema.Boolean,
  authorize: Schema.Boolean,
  translateTo: Schema.NonEmptyString,
  logs: Schema.Struct({
    promotion: Schema.Boolean,
    rejection: Schema.Boolean,
  }),
})
export type BoundaryPipelineDeclaration = typeof BoundaryPipelineDeclaration.Type

export const AdapterBindingDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  port: Schema.NonEmptyString,
  adapter: Schema.NonEmptyString,
  target: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  mode: Schema.Literal("in-memory", "file-backed", "http", "graphql", "mcp", "sql", "home-lab", "fake"),
  configSchema: Schema.optional(Schema.NonEmptyString),
  driftCheck: Schema.optional(Schema.NonEmptyString),
  boundaryPipeline: Schema.optional(BoundaryPipelineDeclaration),
})
export type AdapterBindingDeclaration = typeof AdapterBindingDeclaration.Type

export const PublishedLanguageProtocol = Schema.Literal(
  "openapi",
  "asyncapi",
  "cloudevents",
  "mcp",
  "cli",
)
export type PublishedLanguageProtocol = typeof PublishedLanguageProtocol.Type

export const PublishedLanguageDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  protocol: PublishedLanguageProtocol,
  description: Schema.optional(Schema.NonEmptyString),
  boundarySchemas: Schema.NonEmptyArray(Schema.NonEmptyString),
  ports: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  source: Schema.optional(Schema.NonEmptyString),
})
export type PublishedLanguageDeclaration = typeof PublishedLanguageDeclaration.Type
