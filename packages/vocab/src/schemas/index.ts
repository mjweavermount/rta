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
export * from "./tier.js"

import { Schema } from "effect"
import { BoundedContextDeclaration } from "./context.js"
import { ConnectionsDeclaration } from "./connections.js"
import {
  ArchetypeInstanceDeclaration,
  ArchetypeSpecDeclaration,
  PatternSpecDeclaration,
} from "./tier.js"

// ---------------------------------------------------------------------------
// VocabFile — the top-level union
//
// Any file in the vocab/ directory is one of these shapes, discriminated by
// the `kind` field. Context/connection files describe app/domain vocab; tier
// files describe the vocabulary ladder itself.
// ---------------------------------------------------------------------------

export const VocabFile = Schema.Union(
  BoundedContextDeclaration,
  ConnectionsDeclaration,
  PatternSpecDeclaration,
  ArchetypeSpecDeclaration,
  ArchetypeInstanceDeclaration,
)
export type VocabFile = typeof VocabFile.Type
