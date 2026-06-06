import { Schema } from "effect"
import { ContextClassification } from "./primitives.js"
import { AggregateDeclaration } from "./aggregate.js"
import { QueryDeclaration } from "./message.js"
import { ReadModelDeclaration } from "./read-model.js"
import { DomainServiceDeclaration } from "./service.js"
import { DecisionDeclaration } from "./decision.js"
import { ProcessManagerDeclaration } from "./policy.js"
import { RuntimeCapabilityDeclaration, ToolSurfaceDeclaration } from "./capability.js"
import {
  AdapterBindingDeclaration,
  BoundarySchemaDeclaration,
  PortDeclaration,
  PublishedLanguageDeclaration,
} from "./boundary.js"
import { DeploymentIntentDeclaration } from "./deployment.js"
import { AppWiringDeclaration } from "./wiring.js"

// ---------------------------------------------------------------------------
// Import declaration
//
// Explicit statement that this context depends on types from another context.
// These are the only permitted cross-context type references. All field type
// expressions that reference foreign types must appear here.
// ---------------------------------------------------------------------------

export const ImportDeclaration = Schema.Struct({
  from: Schema.NonEmptyString,
  types: Schema.NonEmptyArray(Schema.NonEmptyString),
})
export type ImportDeclaration = typeof ImportDeclaration.Type

// ---------------------------------------------------------------------------
// Bounded Context
//
// The root vocab unit. One file per context.
//
// What lives here: what EXISTS in this context (aggregates, events, queries,
// read models, services) and what it DEPENDS ON (imports).
//
// What does NOT live here: who is allowed to receive its events — that is a
// strict-layer concern and belongs in a connections file.
// ---------------------------------------------------------------------------

export const BoundedContextDeclaration = Schema.Struct({
  kind: Schema.Literal("BoundedContext"),
  name: Schema.NonEmptyString,
  classification: ContextClassification,
  description: Schema.optional(Schema.NonEmptyString),
  guidance: Schema.optional(Schema.NonEmptyString),
  imports: Schema.optional(Schema.Array(ImportDeclaration)),
  aggregates: Schema.optional(Schema.Array(AggregateDeclaration)),
  queries: Schema.optional(Schema.Array(QueryDeclaration)),
  readModels: Schema.optional(Schema.Array(ReadModelDeclaration)),
  domainServices: Schema.optional(Schema.Array(DomainServiceDeclaration)),
  /** Named outcome evaluations owned by this context. */
  decisions: Schema.optional(Schema.Array(DecisionDeclaration)),
  /** Stateful process managers (aggregate-variant) owned by this context. */
  processManagers: Schema.optional(Schema.Array(ProcessManagerDeclaration)),
  /** External runtime capabilities this context can bind without hard-coding app leaves. */
  runtimeCapabilities: Schema.optional(Schema.Array(RuntimeCapabilityDeclaration)),
  /** Required application capabilities expressed as stable ports. */
  ports: Schema.optional(Schema.Array(PortDeclaration)),
  /** DTO/input/output/schema shapes allowed to cross a boundary. */
  boundarySchemas: Schema.optional(Schema.Array(BoundarySchemaDeclaration)),
  /** Target-specific adapter selections for ports. */
  adapterBindings: Schema.optional(Schema.Array(AdapterBindingDeclaration)),
  /** Public contract language for API/tool/event surfaces, such as OpenAPI. */
  publishedLanguages: Schema.optional(Schema.Array(PublishedLanguageDeclaration)),
  /** Governed agent/UI/CLI/API tool surfaces owned by this context. */
  toolSurfaces: Schema.optional(Schema.Array(ToolSurfaceDeclaration)),
  /** Host-neutral deployment intents plus optional hosting adapter targets. */
  deploymentIntents: Schema.optional(Schema.Array(DeploymentIntentDeclaration)),
  /** Runnable app starts that wire surfaces to boundaries, operations, runtime, and demos. */
  appWiring: Schema.optional(AppWiringDeclaration),
  // Reserved vocab slot:
  // `projectors` likely belongs here if/when Projector is promoted to a
  // first-class primitive. Keep it adjacent to decisions / process managers,
  // not mixed into read models, because the primitive role is "derive and
  // maintain a projection" rather than "the projected shape itself".
  //
  // Rehydrate with a dedicated ProjectorDeclaration schema rather than an
  // inline object shape.
})
export type BoundedContextDeclaration = typeof BoundedContextDeclaration.Type
