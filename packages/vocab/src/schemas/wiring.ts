import { Schema } from "effect"

// ---------------------------------------------------------------------------
// App wiring
//
// Entrypoints are app starts: CLI commands, HTTP routes, MCP tools, scheduled
// jobs, workers, or demo harnesses. They are not adapters. They compose
// declared surfaces, boundary schemas, operations, runtime capabilities,
// deployment intents, and demos into an answerable app graph.
// ---------------------------------------------------------------------------

export const EntrypointKind = Schema.Literal("cli", "http", "mcp-tool", "scheduler", "worker", "demo")
export type EntrypointKind = typeof EntrypointKind.Type

export const AppEntrypointDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  kind: EntrypointKind,
  description: Schema.optional(Schema.NonEmptyString),
  surface: Schema.optional(Schema.NonEmptyString),
  tool: Schema.optional(Schema.NonEmptyString),
  adapterBinding: Schema.optional(Schema.NonEmptyString),
  inputSchema: Schema.NonEmptyString,
  operation: Schema.NonEmptyString,
  runtimeCapabilities: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  deploymentIntent: Schema.optional(Schema.NonEmptyString),
  demo: Schema.NonEmptyString,
})
export type AppEntrypointDeclaration = typeof AppEntrypointDeclaration.Type

export const AppWiringDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  app: Schema.NonEmptyString,
  description: Schema.optional(Schema.NonEmptyString),
  entrypoints: Schema.NonEmptyArray(AppEntrypointDeclaration),
})
export type AppWiringDeclaration = typeof AppWiringDeclaration.Type

