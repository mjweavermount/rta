import { Effect } from "effect"
import { DomainError, type OperationScope } from "@rta/core"
import {
  InstrumentedBoundedContext,
  InstrumentedEdgeBoundary,
  InstrumentedOutboundAdapter,
  InstrumentedPolicy,
  InstrumentedProjector,
  InstrumentedRepository,
  type OperationSummary,
} from "@rta/strict"

export type SourceKind = "personal-obsidian-vault" | "shared-git-markdown"

export interface MarkdownSource {
  readonly sourceId: string
  readonly kind: SourceKind
  readonly rootLabel: string
}

export interface MarkdownFile {
  readonly path: string
  readonly markdown: string
  readonly contentHash: string
  readonly commit?: string
}

export interface GitRenameEvidence {
  readonly fromPath: string
  readonly toPath: string
  readonly similarity: number
  readonly commit: string
}

export interface ProjectionRecord {
  readonly sourceId: string
  readonly sourcePath: string
  readonly contentHash: string
  readonly affineDocId: string
  readonly title: string
  readonly owner: "projection-bot"
  readonly editableInAffine: false
  readonly lastProjectedCommit?: string
  readonly knownAliases: ReadonlyArray<string>
}

export interface ProjectionRegistry {
  readonly findByPath: (sourceId: string, path: string) => ProjectionRecord | undefined
  readonly findByAlias: (sourceId: string, path: string) => ProjectionRecord | undefined
  readonly save: (record: ProjectionRecord) => ProjectionRecord
}

export interface MarkdownSourcePort {
  readonly listFiles: (source: MarkdownSource) => ReadonlyArray<MarkdownFile>
  readonly renameEvidence: (source: MarkdownSource) => ReadonlyArray<GitRenameEvidence>
}

export interface AffineProjectionPort {
  readonly upsertReadOnly: (projection: ReadonlyProjectionDoc) => AffineProjectionReceipt
}

export interface MarkdownProjectionDeps {
  readonly source: MarkdownSourcePort
  readonly registry: ProjectionRegistry
  readonly affine: AffineProjectionPort
  readonly generateDocId: (file: MarkdownFile) => string
}

export interface ReadonlyProjectionDoc {
  readonly sourceId: string
  readonly sourcePath: string
  readonly affineDocId: string
  readonly title: string
  readonly body: string
  readonly owner: "projection-bot"
  readonly editableInAffine: false
  readonly contentHash: string
}

export interface AffineProjectionReceipt {
  readonly affineDocId: string
  readonly action: "created" | "updated"
  readonly owner: "projection-bot"
  readonly editableInAffine: false
  readonly summary: string
}

export interface MarkdownProjectionPlan {
  readonly source: MarkdownSource
  readonly files: ReadonlyArray<MarkdownFile>
  readonly renames: ReadonlyArray<GitRenameEvidence>
}

export interface ResolvedProjection {
  readonly file: MarkdownFile
  readonly existing?: ProjectionRecord
  readonly title: string
  readonly affineDocId: string
  readonly knownAliases: ReadonlyArray<string>
}

export interface MarkdownProjectionRunReceipt {
  readonly sourceId: string
  readonly projected: ReadonlyArray<{
    readonly sourcePath: string
    readonly affineDocId: string
    readonly action: AffineProjectionReceipt["action"]
    readonly editableInAffine: false
  }>
  readonly registryRecords: ReadonlyArray<ProjectionRecord>
}

const titleFromMarkdown = (file: MarkdownFile): string => {
  const heading = file.markdown.split(/\r?\n/).find((line) => /^#\s+/.test(line))
  if (heading) return heading.replace(/^#\s+/, "").trim()
  const basename = file.path.split("/").at(-1) ?? file.path
  return basename.replace(/\.md$/i, "").replace(/[-_]+/g, " ")
}

const projectionBody = (source: MarkdownSource, file: MarkdownFile): string => [
  `> Read-only projection from ${source.kind}.`,
  `> Source: ${source.rootLabel}/${file.path}`,
  `> Edits happen at the source. AFFiNE is a shared view/canvas surface.`,
  "",
  file.markdown,
].join("\n")

export class MarkdownSourceScanner extends InstrumentedOutboundAdapter<
  { readonly source: MarkdownSource; readonly deps: MarkdownProjectionDeps },
  MarkdownProjectionPlan
> {
  constructor() {
    super("MarkdownSourceScanner", "MarkdownProjection")
  }

  protected summarize(input: { readonly source: MarkdownSource }): OperationSummary {
    return {
      action: `Scan ${input.source.sourceId}`,
      reason: "the source repository or vault is the authority for shared Markdown",
      with: ["MarkdownSourcePort", "Git history"],
      input: input.source.rootLabel,
      output: "Markdown projection plan",
      lineage: ["primitive:outbound-adapter", "pattern:source-authority"],
      boundary: { system: input.source.kind, operation: "list-markdown", mode: "read" },
    }
  }

  protected execute(input: { readonly source: MarkdownSource; readonly deps: MarkdownProjectionDeps }): Effect.Effect<MarkdownProjectionPlan> {
    return Effect.succeed({
      source: input.source,
      files: input.deps.source.listFiles(input.source),
      renames: input.deps.source.renameEvidence(input.source),
    })
  }
}

export class MarkdownProjectionBoundary extends InstrumentedEdgeBoundary<MarkdownProjectionPlan, MarkdownProjectionPlan> {
  constructor() {
    super("MarkdownProjectionBoundary", "MarkdownProjection")
  }

  protected summarize(input: MarkdownProjectionPlan): OperationSummary {
    return {
      action: `Validate ${input.files.length} Markdown files`,
      reason: "filesystem and Git input is external even when it is local",
      with: ["path allowlist", "sidecar rejection"],
      input: input.source.sourceId,
      output: "sanitized projection plan",
      lineage: ["primitive:edge-boundary", "pattern:markdown-projection"],
    }
  }

  protected execute(input: MarkdownProjectionPlan): Effect.Effect<MarkdownProjectionPlan, DomainError> {
    for (const file of input.files) {
      if (!file.path.endsWith(".md")) {
        return Effect.fail(new DomainError({ message: "Only naked Markdown files may be projected", context: { path: file.path } }))
      }
      if (file.path.startsWith(".") || file.path.includes("/.") || file.path.includes("..")) {
        return Effect.fail(new DomainError({ message: "Projection source path is not allowed", context: { path: file.path } }))
      }
    }
    return Effect.succeed(input)
  }
}

export class ReadOnlyProjectionPolicy extends InstrumentedPolicy<MarkdownProjectionPlan, MarkdownProjectionPlan> {
  constructor() {
    super("ReadOnlyProjectionPolicy", "MarkdownProjection")
  }

  protected summarize(input: MarkdownProjectionPlan): OperationSummary {
    return {
      action: `Apply read-only policy for ${input.source.sourceId}`,
      reason: "AFFiNE projections must be bot-owned and non-editable, including for the source owner",
      with: ["custody policy"],
      input: input.source.kind,
      output: "projection policy decision",
      lineage: ["primitive:policy", "pattern:markdown-projection"],
    }
  }

  protected execute(input: MarkdownProjectionPlan): Effect.Effect<MarkdownProjectionPlan> {
    return Effect.succeed(input)
  }
}

export class ProjectionRegistryRepository extends InstrumentedRepository<
  { readonly plan: MarkdownProjectionPlan; readonly deps: MarkdownProjectionDeps },
  ReadonlyArray<ResolvedProjection>
> {
  constructor() {
    super("ProjectionRegistryRepository", "MarkdownProjection")
  }

  protected summarize(input: { readonly plan: MarkdownProjectionPlan }): OperationSummary {
    return {
      action: `Resolve projection identities for ${input.plan.source.sourceId}`,
      reason: "the registry lives outside the naked Markdown repo and preserves AFFiNE identity across renames",
      with: ["ProjectionRegistry", "Git rename evidence"],
      input: input.plan.source.sourceId,
      output: "resolved projection identities",
      lineage: ["primitive:repository", "pattern:projection-registry"],
    }
  }

  protected execute(input: { readonly plan: MarkdownProjectionPlan; readonly deps: MarkdownProjectionDeps }): Effect.Effect<ReadonlyArray<ResolvedProjection>> {
    const resolved = input.plan.files.map((file) => {
      const rename = input.plan.renames.find((candidate) => candidate.toPath === file.path)
      const existing = input.deps.registry.findByPath(input.plan.source.sourceId, file.path)
        ?? input.deps.registry.findByAlias(input.plan.source.sourceId, file.path)
        ?? (rename ? input.deps.registry.findByPath(input.plan.source.sourceId, rename.fromPath) : undefined)
        ?? (rename ? input.deps.registry.findByAlias(input.plan.source.sourceId, rename.fromPath) : undefined)
      const aliases = new Set(existing?.knownAliases ?? [])
      if (rename) aliases.add(rename.fromPath)
      return {
        file,
        existing,
        title: titleFromMarkdown(file),
        affineDocId: existing?.affineDocId ?? input.deps.generateDocId(file),
        knownAliases: [...aliases],
      }
    })
    return Effect.succeed(resolved)
  }
}

export class MarkdownToAffineProjector extends InstrumentedProjector<
  { readonly source: MarkdownSource; readonly resolved: ReadonlyArray<ResolvedProjection> },
  ReadonlyArray<ReadonlyProjectionDoc>
> {
  constructor() {
    super("MarkdownToAffineProjector", "MarkdownProjection")
  }

  protected summarize(input: { readonly source: MarkdownSource; readonly resolved: ReadonlyArray<ResolvedProjection> }): OperationSummary {
    return {
      action: `Render ${input.resolved.length} AFFiNE projections`,
      reason: "AFFiNE should receive a derived reading surface, not become the Markdown source of truth",
      with: ["Markdown renderer", "AFFiNE projection"],
      input: input.source.sourceId,
      output: "read-only projection docs",
      lineage: ["primitive:projector", "pattern:markdown-projection"],
    }
  }

  protected execute(input: { readonly source: MarkdownSource; readonly resolved: ReadonlyArray<ResolvedProjection> }): Effect.Effect<ReadonlyArray<ReadonlyProjectionDoc>> {
    return Effect.succeed(input.resolved.map((item) => ({
      sourceId: input.source.sourceId,
      sourcePath: item.file.path,
      affineDocId: item.affineDocId,
      title: item.title,
      body: projectionBody(input.source, item.file),
      owner: "projection-bot",
      editableInAffine: false,
      contentHash: item.file.contentHash,
    })))
  }
}

export class AffineReadonlyProjectionAdapter extends InstrumentedOutboundAdapter<
  { readonly source: MarkdownSource; readonly resolved: ReadonlyArray<ResolvedProjection>; readonly docs: ReadonlyArray<ReadonlyProjectionDoc>; readonly deps: MarkdownProjectionDeps },
  MarkdownProjectionRunReceipt
> {
  constructor() {
    super("AffineReadonlyProjectionAdapter", "MarkdownProjection")
  }

  protected summarize(input: { readonly source: MarkdownSource; readonly docs: ReadonlyArray<ReadonlyProjectionDoc> }): OperationSummary {
    return {
      action: `Upsert ${input.docs.length} AFFiNE read-only projections`,
      reason: "AFFiNE is the shared view/canvas layer for source-owned Markdown",
      with: ["AFFiNE"],
      input: input.source.sourceId,
      output: "projection receipts",
      lineage: ["primitive:outbound-adapter", "system:affine"],
      boundary: { system: "AFFiNE", operation: "upsert-readonly-projection", mode: "committed" },
    }
  }

  protected execute(input: {
    readonly source: MarkdownSource
    readonly resolved: ReadonlyArray<ResolvedProjection>
    readonly docs: ReadonlyArray<ReadonlyProjectionDoc>
    readonly deps: MarkdownProjectionDeps
  }): Effect.Effect<MarkdownProjectionRunReceipt> {
    const registryRecords: ProjectionRecord[] = []
    const projected = input.docs.map((doc) => {
      const receipt = input.deps.affine.upsertReadOnly(doc)
      const resolved = input.resolved.find((item) => item.affineDocId === doc.affineDocId)
      const record = input.deps.registry.save({
        sourceId: input.source.sourceId,
        sourcePath: doc.sourcePath,
        contentHash: doc.contentHash,
        affineDocId: doc.affineDocId,
        title: doc.title,
        owner: "projection-bot",
        editableInAffine: false,
        lastProjectedCommit: resolved?.file.commit,
        knownAliases: resolved?.knownAliases ?? [],
      })
      registryRecords.push(record)
      return {
        sourcePath: doc.sourcePath,
        affineDocId: receipt.affineDocId,
        action: receipt.action,
        editableInAffine: receipt.editableInAffine,
      }
    })
    return Effect.succeed({
      sourceId: input.source.sourceId,
      projected,
      registryRecords,
    })
  }
}

export class MarkdownProjectionContext extends InstrumentedBoundedContext<
  { readonly source: MarkdownSource; readonly deps: MarkdownProjectionDeps },
  MarkdownProjectionRunReceipt
> {
  private readonly scanner = new MarkdownSourceScanner()
  private readonly boundary = new MarkdownProjectionBoundary()
  private readonly policy = new ReadOnlyProjectionPolicy()
  private readonly registry = new ProjectionRegistryRepository()
  private readonly projector = new MarkdownToAffineProjector()
  private readonly affine = new AffineReadonlyProjectionAdapter()

  constructor() {
    super("MarkdownProjectionContext", "MarkdownProjection")
  }

  protected summarize(input: { readonly source: MarkdownSource }): OperationSummary {
    return {
      action: `Project ${input.source.sourceId} into AFFiNE`,
      reason: "developers should collaborate in Git/Obsidian while AFFiNE remains a bot-owned shared view and canvas",
      with: ["SourceScanner", "ProjectionRegistry", "AFFiNE"],
      input: input.source.rootLabel,
      output: "read-only AFFiNE projections",
      lineage: ["primitive:bounded-context", "pattern:markdown-projection"],
    }
  }

  protected execute(input: { readonly source: MarkdownSource; readonly deps: MarkdownProjectionDeps }, scope: OperationScope): Effect.Effect<MarkdownProjectionRunReceipt, DomainError> {
    return Effect.gen(this, function* () {
      const scanned = yield* this.scanner.invoke({ source: input.source, deps: input.deps }, scope.fork("scan-source"))
      const sanitized = yield* this.boundary.invoke(scanned, scope.fork("sanitize-source"))
      const allowed = yield* this.policy.invoke(sanitized, scope.fork("read-only-policy"))
      const resolved = yield* this.registry.invoke({ plan: allowed, deps: input.deps }, scope.fork("resolve-registry"))
      const docs = yield* this.projector.invoke({ source: input.source, resolved }, scope.fork("render-affine"))
      return yield* this.affine.invoke({ source: input.source, resolved, docs, deps: input.deps }, scope.fork("upsert-affine"))
    })
  }
}

export const createInMemoryProjectionDeps = (options: {
  readonly files: ReadonlyArray<MarkdownFile>
  readonly renames?: ReadonlyArray<GitRenameEvidence>
  readonly records?: ReadonlyArray<ProjectionRecord>
}): MarkdownProjectionDeps & { readonly affineDocs: Map<string, ReadonlyProjectionDoc>; readonly records: Map<string, ProjectionRecord> } => {
  const records = new Map<string, ProjectionRecord>()
  for (const record of options.records ?? []) records.set(`${record.sourceId}:${record.sourcePath}`, record)
  const affineDocs = new Map<string, ReadonlyProjectionDoc>()
  return {
    affineDocs,
    records,
    source: {
      listFiles: () => options.files,
      renameEvidence: () => options.renames ?? [],
    },
    registry: {
      findByPath: (sourceId, path) => records.get(`${sourceId}:${path}`),
      findByAlias: (sourceId, path) => [...records.values()].find((record) =>
        record.sourceId === sourceId && record.knownAliases.includes(path),
      ),
      save: (record) => {
        for (const [key, value] of records.entries()) {
          if (value.sourceId === record.sourceId && value.affineDocId === record.affineDocId && key !== `${record.sourceId}:${record.sourcePath}`) {
            records.delete(key)
          }
        }
        records.set(`${record.sourceId}:${record.sourcePath}`, record)
        return record
      },
    },
    affine: {
      upsertReadOnly: (projection) => {
        const action = affineDocs.has(projection.affineDocId) ? "updated" : "created"
        affineDocs.set(projection.affineDocId, projection)
        return {
          affineDocId: projection.affineDocId,
          action,
          owner: "projection-bot",
          editableInAffine: false,
          summary: `Projected ${projection.sourcePath} as bot-owned read-only AFFiNE doc ${projection.affineDocId}.`,
        }
      },
    },
    generateDocId: (file) => `affine-${file.contentHash.slice(0, 8)}`,
  }
}
