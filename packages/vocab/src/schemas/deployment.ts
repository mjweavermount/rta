import { Schema } from "effect"

// ---------------------------------------------------------------------------
// Deployment intent
//
// Deployment is host-neutral in core vocab. A target such as Virgil's home lab
// is an optional adapter output, not a requirement for every RTA app.
// ---------------------------------------------------------------------------

export const DeploymentTarget = Schema.Literal("local", "container", "home-lab", "cloud")
export type DeploymentTarget = typeof DeploymentTarget.Type

export const DeploymentAdapter = Schema.Literal(
  "process",
  "container",
  "workload-app",
  "docker-compose",
  "kubernetes",
  "cloud-run",
)
export type DeploymentAdapter = typeof DeploymentAdapter.Type

export const DeploymentProcessRole = Schema.Literal("api", "worker", "scheduler", "cli", "monitor")
export type DeploymentProcessRole = typeof DeploymentProcessRole.Type

export const DeploymentPortProtocol = Schema.Literal("http", "tcp")
export type DeploymentPortProtocol = typeof DeploymentPortProtocol.Type

export const DeploymentPortDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  port: Schema.Positive,
  protocol: DeploymentPortProtocol,
})
export type DeploymentPortDeclaration = typeof DeploymentPortDeclaration.Type

export const DeploymentHealthCheckDeclaration = Schema.Struct({
  process: Schema.NonEmptyString,
  path: Schema.NonEmptyString,
  port: Schema.optional(Schema.NonEmptyString),
})
export type DeploymentHealthCheckDeclaration = typeof DeploymentHealthCheckDeclaration.Type

export const DeploymentImageDeclaration = Schema.Struct({
  repository: Schema.NonEmptyString,
  tag: Schema.NonEmptyString,
})
export type DeploymentImageDeclaration = typeof DeploymentImageDeclaration.Type

export const DeploymentProcessDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  role: DeploymentProcessRole,
  command: Schema.NonEmptyArray(Schema.NonEmptyString),
  ports: Schema.optional(Schema.Array(DeploymentPortDeclaration)),
})
export type DeploymentProcessDeclaration = typeof DeploymentProcessDeclaration.Type

export const DeploymentSecretSource = Schema.Literal("runtime-capability", "external-secret")
export type DeploymentSecretSource = typeof DeploymentSecretSource.Type

export const DeploymentSecretDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  source: DeploymentSecretSource,
  runtimeCapability: Schema.optional(Schema.NonEmptyString),
})
export type DeploymentSecretDeclaration = typeof DeploymentSecretDeclaration.Type

export const DeploymentPromotionDeclaration = Schema.Struct({
  requiresReview: Schema.Boolean,
  writesToExternalSystem: Schema.Boolean,
})
export type DeploymentPromotionDeclaration = typeof DeploymentPromotionDeclaration.Type

export const DeploymentIntentDeclaration = Schema.Struct({
  name: Schema.NonEmptyString,
  app: Schema.NonEmptyString,
  target: DeploymentTarget,
  adapter: DeploymentAdapter,
  optional: Schema.Boolean,
  description: Schema.optional(Schema.NonEmptyString),
  runtimeCapability: Schema.optional(Schema.NonEmptyString),
  image: Schema.optional(DeploymentImageDeclaration),
  processes: Schema.NonEmptyArray(DeploymentProcessDeclaration),
  healthCheck: DeploymentHealthCheckDeclaration,
  configSchemas: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  secrets: Schema.optional(Schema.Array(DeploymentSecretDeclaration)),
  promotion: DeploymentPromotionDeclaration,
})
export type DeploymentIntentDeclaration = typeof DeploymentIntentDeclaration.Type

