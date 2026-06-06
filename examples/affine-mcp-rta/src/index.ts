import { Effect } from "effect"
import { DomainError, type OperationScope } from "@rta/core"
import {
  InstrumentedBoundedContext,
  InstrumentedEdgeBoundary,
  InstrumentedOutboundAdapter,
  InstrumentedPolicy,
  type OperationSummary,
} from "@rta/strict"

export type AffineMcpTool =
  | "affine.context_pack"
  | "affine.artifact_plan"
  | "affine.artifact_stage"
  | "source.search"
  | "source.diff_plan"
  | "source.inline_edit_stage"
  | "output.stage"
  | "affine.doc_commit"

export interface AffineToolCall {
  readonly tool: AffineMcpTool
  readonly input: Record<string, unknown>
  readonly credentialKind: "user" | "shared" | "none"
}

export interface NormalizedAffineToolCall extends AffineToolCall {
  readonly topic?: string
  readonly area?: string
  readonly title?: string
}

export interface AffineDocSummary {
  readonly id: string
  readonly title: string
  readonly summary?: string
  readonly updatedAt?: string
}

export interface AffineArtifactReceipt {
  readonly tool: AffineMcpTool
  readonly status: "completed" | "staged" | "fail-closed"
  readonly summary: string
  readonly talksTo: ReadonlyArray<string>
  readonly data: unknown
}

export interface AffineKnowledgePort {
  readonly recentDocs: () => ReadonlyArray<AffineDocSummary>
}

export interface SourceWorkbenchPort {
  readonly search: (query: string) => ReadonlyArray<{ readonly path: string; readonly reason: string }>
  readonly diffPlan: (target: string, desired: string) => { readonly target: string; readonly hunks: number; readonly mode: "proposal" }
  readonly inlineEditStage: (target: string, desired: string) => { readonly target: string; readonly staged: true; readonly preview: string }
}

export interface OutputPort {
  readonly stage: (title: string, markdown: string, area: string) => { readonly title: string; readonly area: string; readonly bytes: number }
}

export interface AffineMcpDeps {
  readonly affine: AffineKnowledgePort
  readonly source: SourceWorkbenchPort
  readonly output: OutputPort
}

const readRequiredString = (input: Record<string, unknown>, key: string): Effect.Effect<string, DomainError> => {
  const value = input[key]
  if (typeof value !== "string" || !value.trim()) {
    return Effect.fail(new DomainError({ message: `${key} is required` }))
  }
  return Effect.succeed(value.trim())
}

export class AffineMcpToolBoundary extends InstrumentedEdgeBoundary<AffineToolCall, NormalizedAffineToolCall> {
  constructor() {
    super("AffineMcpToolBoundary", "AffineMcp")
  }

  protected summarize(input: AffineToolCall): OperationSummary {
    return {
      action: `Validate ${input.tool}`,
      reason: "AFFiNE MCP inputs must be decoded and normalized before touching garden or source-workbench ports",
      with: ["MCP tool args"],
      input: input.tool,
      output: "normalized AFFiNE tool call",
      lineage: ["primitive:edge-boundary", "sanitization:mcp-tool"],
      boundary: { system: "AFFiNE MCP client", operation: input.tool, mode: "read" },
    }
  }

  protected execute(input: AffineToolCall): Effect.Effect<NormalizedAffineToolCall, DomainError> {
    if (input.tool === "affine.context_pack" || input.tool === "affine.artifact_plan") {
      return readRequiredString(input.input, "topic").pipe(
        Effect.map((topic) => ({ ...input, topic })),
      )
    }
    if (input.tool === "affine.artifact_stage" || input.tool === "output.stage") {
      return Effect.all({
        title: readRequiredString(input.input, "title"),
        area: readRequiredString(input.input, "area"),
      }).pipe(Effect.map(({ title, area }) => ({ ...input, title, area })))
    }
    if (input.tool.startsWith("source.")) {
      return Effect.succeed(input)
    }
    return Effect.succeed(input)
  }
}

export class AffineWritePolicy extends InstrumentedPolicy<NormalizedAffineToolCall, NormalizedAffineToolCall> {
  constructor() {
    super("AffineWritePolicy", "AffineMcp")
  }

  protected summarize(input: NormalizedAffineToolCall): OperationSummary {
    return {
      action: `Decide write posture for ${input.tool}`,
      reason: "AFFiNE WYSIWYG documents can support direct edits only after the MCP client deliberately chooses a write-capable tool",
      with: ["Tool safety", "Credential kind"],
      input: input.tool,
      output: "allowed, staged, or fail-closed",
      lineage: ["primitive:policy", "pattern:artifact-growth"],
    }
  }

  protected execute(input: NormalizedAffineToolCall): Effect.Effect<NormalizedAffineToolCall, DomainError> {
    if (input.tool === "affine.doc_commit") {
      return Effect.fail(new DomainError({
        message: "AFFiNE durable document commit is fail-closed until the writer backend is RTA-owned and demo-covered.",
      }))
    }
    return Effect.succeed(input)
  }
}

export class AffineKnowledgeAdapter extends InstrumentedOutboundAdapter<
  { readonly call: NormalizedAffineToolCall; readonly deps: AffineMcpDeps },
  AffineArtifactReceipt
> {
  constructor() {
    super("AffineKnowledgeAdapter", "AffineMcp")
  }

  protected summarize(input: { readonly call: NormalizedAffineToolCall }): OperationSummary {
    return {
      action: `Talk to AFFiNE for ${input.call.tool}`,
      reason: "artifact growth needs nearby garden context before creating or editing docs",
      with: ["AFFiNE"],
      input: input.call.topic ?? input.call.tool,
      output: "artifact context or staged artifact",
      lineage: ["primitive:outbound-adapter", "system:affine"],
      boundary: { system: "AFFiNE", operation: input.call.tool, mode: "read" },
    }
  }

  protected execute(input: { readonly call: NormalizedAffineToolCall; readonly deps: AffineMcpDeps }): Effect.Effect<AffineArtifactReceipt, DomainError> {
    const call = input.call
    if (call.tool === "affine.context_pack") {
      const docs = input.deps.affine.recentDocs()
      const topic = call.topic ?? ""
      const primaryDocs = docs.filter((doc) => `${doc.title} ${doc.summary ?? ""}`.toLowerCase().includes(topic.toLowerCase().split(/\s+/)[0] ?? ""))
      return Effect.succeed({
        tool: call.tool,
        status: "completed",
        summary: `I built an AFFiNE context pack for ${topic} because the client is growing an artifact near that area.`,
        talksTo: ["AFFiNE"],
        data: {
          topic,
          primaryDocs: primaryDocs.length ? primaryDocs : docs.slice(0, 3),
          guidance: ["do not duplicate chat history", "append to nearby artifacts when the topic loops back"],
        },
      })
    }
    if (call.tool === "affine.artifact_plan") {
      return Effect.succeed({
        tool: call.tool,
        status: "completed",
        summary: `I planned artifact growth for ${call.topic} because conversation should become durable docs, not chat logs.`,
        talksTo: ["AFFiNE"],
        data: {
          topic: call.topic,
          artifactKinds: ["spec", "gdd", "article", "research-brief", "decision", "task-set", "index"],
          indexUpdates: ["area/index", "artifact/index"],
          invariant: "Do not store transcript or chat history as the artifact.",
        },
      })
    }
    if (call.tool === "affine.artifact_stage") {
      return readRequiredString(call.input, "markdown").pipe(
        Effect.map((markdown) => ({
          tool: call.tool,
          status: "staged",
          summary: `I staged ${call.title} because the client chose a reviewable AFFiNE artifact package.`,
          talksTo: ["AFFiNE"],
          data: input.deps.output.stage(call.title ?? "Untitled", markdown, call.area ?? "garden/inbox"),
        })),
      )
    }
    return Effect.fail(new DomainError({ message: `Unsupported AFFiNE knowledge tool ${call.tool}` }))
  }
}

export class SourceWorkbenchAdapter extends InstrumentedOutboundAdapter<
  { readonly call: NormalizedAffineToolCall; readonly deps: AffineMcpDeps },
  AffineArtifactReceipt
> {
  constructor() {
    super("SourceWorkbenchAdapter", "AffineMcp")
  }

  protected summarize(input: { readonly call: NormalizedAffineToolCall }): OperationSummary {
    return {
      action: `Use source workbench ${input.call.tool}`,
      reason: "agents need efficient explore, diff, inline edit, and output flows around source-backed artifacts",
      with: ["SourceWorkbench"],
      input: input.call.tool,
      output: "source workbench receipt",
      lineage: ["primitive:outbound-adapter", "pattern:source-workbench"],
      boundary: { system: "SourceWorkbench", operation: input.call.tool, mode: "staged", reviewRequired: true },
    }
  }

  protected execute(input: { readonly call: NormalizedAffineToolCall; readonly deps: AffineMcpDeps }): Effect.Effect<AffineArtifactReceipt, DomainError> {
    const query = typeof input.call.input["query"] === "string" ? input.call.input["query"] : ""
    const target = typeof input.call.input["target"] === "string" ? input.call.input["target"] : ""
    const desired = typeof input.call.input["desired"] === "string" ? input.call.input["desired"] : ""
    if (input.call.tool === "source.search") {
      return Effect.succeed({
        tool: input.call.tool,
        status: "completed",
        summary: `I searched source context for ${query} because the client needs precise nearby code or docs.`,
        talksTo: ["SourceWorkbench"],
        data: input.deps.source.search(query),
      })
    }
    if (input.call.tool === "source.diff_plan") {
      return Effect.succeed({
        tool: input.call.tool,
        status: "staged",
        summary: `I prepared a diff plan for ${target} because inline edits should be reviewable before apply.`,
        talksTo: ["SourceWorkbench"],
        data: input.deps.source.diffPlan(target, desired),
      })
    }
    if (input.call.tool === "source.inline_edit_stage") {
      return Effect.succeed({
        tool: input.call.tool,
        status: "staged",
        summary: `I staged an inline edit for ${target} because the client requested source-shaped artifact growth.`,
        talksTo: ["SourceWorkbench"],
        data: input.deps.source.inlineEditStage(target, desired),
      })
    }
    return Effect.fail(new DomainError({ message: `Unsupported source workbench tool ${input.call.tool}` }))
  }
}

export class AffineMcpContext extends InstrumentedBoundedContext<
  { readonly call: AffineToolCall; readonly deps: AffineMcpDeps },
  AffineArtifactReceipt
> {
  private readonly boundary = new AffineMcpToolBoundary()
  private readonly policy = new AffineWritePolicy()
  private readonly affine = new AffineKnowledgeAdapter()
  private readonly source = new SourceWorkbenchAdapter()

  constructor() {
    super("AffineMcpContext", "AffineMcp")
  }

  protected summarize(input: { readonly call: AffineToolCall }): OperationSummary {
    return {
      action: `Handle AFFiNE MCP ${input.call.tool}`,
      reason: "the AFFiNE app owns garden context, artifact growth, and source workbench tools behind the shared auth layer",
      with: ["AFFiNE", "SourceWorkbench", "Output"],
      input: input.call.tool,
      output: "AFFiNE MCP receipt",
      lineage: ["primitive:bounded-context", "archetype:mcp-gateway", "pattern:artifact-growth"],
    }
  }

  protected execute(input: { readonly call: AffineToolCall; readonly deps: AffineMcpDeps }, scope: OperationScope): Effect.Effect<AffineArtifactReceipt, DomainError> {
    return Effect.gen(this, function* () {
      const call = yield* this.boundary.invoke(input.call, scope.fork("affine-boundary"))
      const allowed = yield* this.policy.invoke(call, scope.fork("affine-policy"))
      if (allowed.tool.startsWith("source.")) {
        return yield* this.source.invoke({ call: allowed, deps: input.deps }, scope.fork("source-workbench"))
      }
      if (allowed.tool === "output.stage") {
        const markdown = yield* readRequiredString(allowed.input, "markdown")
        return {
          tool: allowed.tool,
          status: "staged",
          summary: `I staged ${allowed.title} in output because the client requested online /output behavior.`,
          talksTo: ["Output"],
          data: input.deps.output.stage(allowed.title ?? "Untitled", markdown, allowed.area ?? "garden/inbox"),
        }
      }
      return yield* this.affine.invoke({ call: allowed, deps: input.deps }, scope.fork("affine-adapter"))
    })
  }
}

export const createFakeAffineMcpDeps = (): AffineMcpDeps => ({
  affine: {
    recentDocs: () => [
      { id: "doc-rta", title: "RTA MCP Notes", summary: "Artifact growth and auth layer", updatedAt: "2026-06-06T00:00:00.000Z" },
      { id: "doc-affine", title: "AFFiNE Garden", summary: "Docs, indexes, specs, and research briefs" },
    ],
  },
  source: {
    search: (query) => [{ path: "src/index.ts", reason: `matched ${query}` }],
    diffPlan: (target, desired) => ({ target, hunks: desired ? 1 : 0, mode: "proposal" }),
    inlineEditStage: (target, desired) => ({ target, staged: true, preview: desired.slice(0, 120) }),
  },
  output: {
    stage: (title, markdown, area) => ({ title, area, bytes: Buffer.byteLength(markdown, "utf8") }),
  },
})
