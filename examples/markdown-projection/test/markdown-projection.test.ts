import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { ContextFactory, SimulatedRandom } from "@rta/core"
import { subscribePrimitiveLifecycle, type PrimitiveLifecycleEvent } from "@rta/strict"
import {
  createInMemoryProjectionDeps,
  MarkdownProjectionContext,
  type AffineProjectionPort,
  type MarkdownSource,
  type ProjectionRecord,
} from "../src/index.js"

const source: MarkdownSource = {
  sourceId: "collective-docs",
  kind: "shared-git-markdown",
  rootLabel: "tower/git/collective-docs",
}

const scope = () => new ContextFactory(
  undefined,
  new SimulatedRandom([
    "proj-op",
    "proj-span-1",
    "proj-span-2",
    "proj-span-3",
    "proj-span-4",
    "proj-span-5",
    "proj-span-6",
    "proj-span-7",
  ]),
).createExternal({ actorId: "projection-bot" }).promote("internal", {
  message: "project source-owned Markdown into AFFiNE",
})

describe("RTA Markdown projection app", () => {
  it("projects naked Markdown into bot-owned read-only AFFiNE docs", async () => {
    const events: PrimitiveLifecycleEvent[] = []
    const unsubscribe = subscribePrimitiveLifecycle((event) => events.push(event))
    try {
      const deps = createInMemoryProjectionDeps({
        files: [{
          path: "business/plan.md",
          markdown: "# Business Plan\n\nShared source lives in Git.",
          contentHash: "abc123456789",
          commit: "c1",
        }],
      })

      const receipt = await Effect.runPromise(new MarkdownProjectionContext().invoke({ source, deps }, scope()))

      expect(receipt.projected).toEqual([{
        sourcePath: "business/plan.md",
        affineDocId: "affine-abc12345",
        action: "created",
        editableInAffine: false,
      }])
      expect(deps.affineDocs.get("affine-abc12345")).toMatchObject({
        owner: "projection-bot",
        editableInAffine: false,
        title: "Business Plan",
      })
      expect(events.map((event) => event.primitiveType)).toEqual(expect.arrayContaining([
        "bounded-context",
        "outbound-adapter",
        "edge-boundary",
        "policy",
        "repository",
        "projector",
      ]))
    } finally {
      unsubscribe()
    }
  })

  it("uses Git rename evidence to update the same AFFiNE doc instead of duplicating it", async () => {
    const existing: ProjectionRecord = {
      sourceId: "collective-docs",
      sourcePath: "business-plan.md",
      contentHash: "oldhash",
      affineDocId: "affine-existing",
      title: "Business Plan",
      owner: "projection-bot",
      editableInAffine: false,
      lastProjectedCommit: "c0",
      knownAliases: [],
    }
    const deps = createInMemoryProjectionDeps({
      records: [existing],
      renames: [{ fromPath: "business-plan.md", toPath: "business/plan.md", similarity: 96, commit: "c2" }],
      files: [{
        path: "business/plan.md",
        markdown: "# Business Plan\n\nRenamed, not new.",
        contentHash: "newhash123",
        commit: "c2",
      }],
    })

    const receipt = await Effect.runPromise(new MarkdownProjectionContext().invoke({ source, deps }, scope()))

    expect(receipt.projected[0]?.affineDocId).toBe("affine-existing")
    expect(receipt.registryRecords[0]).toMatchObject({
      sourcePath: "business/plan.md",
      affineDocId: "affine-existing",
      knownAliases: ["business-plan.md"],
    })
    expect(deps.records.has("collective-docs:business-plan.md")).toBe(false)
    expect(deps.records.has("collective-docs:business/plan.md")).toBe(true)
  })

  it("rejects hidden sidecar/control files from the source repo", async () => {
    const deps = createInMemoryProjectionDeps({
      files: [{
        path: ".rta/registry.md",
        markdown: "# Nope",
        contentHash: "bad",
      }],
    })

    await expect(Effect.runPromise(new MarkdownProjectionContext().invoke({ source, deps }, scope()))).rejects.toMatchObject({
      message: "Projection source path is not allowed",
    })
  })

  it("rejects an AFFiNE adapter receipt that violates read-only projection posture", async () => {
    const badAffine: AffineProjectionPort = {
      upsertReadOnly: (projection) => ({
        affineDocId: projection.affineDocId,
        action: "created",
        owner: "projection-bot",
        editableInAffine: true as false,
        summary: "bad receipt",
      }),
    }
    const deps = {
      ...createInMemoryProjectionDeps({
        files: [{
          path: "business/plan.md",
          markdown: "# Business Plan\n\nShared source lives in Git.",
          contentHash: "abc123456789",
          commit: "c1",
        }],
      }),
      affine: badAffine,
    }

    await expect(Effect.runPromise(new MarkdownProjectionContext().invoke({ source, deps }, scope()))).rejects.toMatchObject({
      message: "AFFiNE projection receipt is editable in AFFiNE",
    })
  })
})
