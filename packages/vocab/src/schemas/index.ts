export * from "./primitives.js"
export * from "./message.js"
export * from "./aggregate.js"
export * from "./read-model.js"
export * from "./service.js"
export * from "./rule.js"
export * from "./decision.js"
export * from "./policy.js"
export * from "./capability.js"
export * from "./boundary.js"
export * from "./deployment.js"
export * from "./wiring.js"
export * from "./context.js"
export * from "./connections.js"

import { Schema } from "effect"
import { BoundedContextDeclaration } from "./context.js"
import { ConnectionsDeclaration } from "./connections.js"

// ---------------------------------------------------------------------------
// VocabFile — the top-level union
//
// Any file in the vocab/ directory is one of these two shapes, discriminated
// by the `kind` field. Schema.Union tries BoundedContext first; if `kind`
// doesn't match the literal it falls through to Connections.
// ---------------------------------------------------------------------------

export const VocabFile = Schema.Union(BoundedContextDeclaration, ConnectionsDeclaration)
export type VocabFile = typeof VocabFile.Type
