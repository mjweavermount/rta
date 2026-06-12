import { describe, expect, it } from "vitest"
import { resolve } from "node:path"
import {
  buildCatalog,
  readCatalogSource,
  sourceLinksForPath,
} from "../src/catalog.js"

const repoRoot = resolve(__dirname, "../../..")

describe("catalog", () => {
  it("discovers vocabulary, concept articles, vocab symbols, ARDs, and source files", async () => {
    const catalog = await buildCatalog(repoRoot)
    const ids = new Set(catalog.nodes.map((node) => node.id))

    expect(ids.has("concept.rta-heart")).toBe(true)
    expect(ids.has("concept.vocabulary-ladder")).toBe(true)
    expect(ids.has("concept.app-anatomy")).toBe(true)
    expect(ids.has("vocab-symbol.PatternSpec")).toBe(true)
    expect(ids.has("vocab-symbol.BoundedContext")).toBe(true)
    expect(ids.has("vocab-symbol.BoundarySchema")).toBe(true)
    expect(ids.has("vocab-symbol.AdapterBinding")).toBe(true)
    expect(ids.has("vocab-symbol.FileBackedRepository")).toBe(true)
    expect(ids.has("pattern.boundary-schema")).toBe(true)
    expect([...ids].some((id) => id.startsWith("ARD-"))).toBe(true)
    expect(ids.has("source.packages/vocab/src/schemas/tier.ts")).toBe(true)
    expect([...ids].some((id) => id.startsWith("source..rta/"))).toBe(false)
    expect([...ids].some((id) => id.startsWith("source.generated/"))).toBe(false)
  })

  it("keeps semantic catalog ids unique and leaves failing fixtures as source only", async () => {
    const catalog = await buildCatalog(repoRoot)
    const ids = catalog.nodes.map((node) => node.id)
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)

    expect(duplicateIds).toEqual([])
    expect(catalog.nodes.some((node) =>
      node.kind !== "source-file" &&
      node.path.startsWith("fixtures/golden/fail/"),
    )).toBe(false)
    expect(catalog.nodes.some((node) =>
      node.kind !== "source-file" &&
      node.path.startsWith("packages/vocab/test/fixtures/"),
    )).toBe(false)
    expect(catalog.nodes.some((node) =>
      node.kind === "source-file" &&
      node.path.startsWith("fixtures/golden/fail/"),
    )).toBe(true)
    expect(catalog.nodes.flatMap((node) => node.inheritsFrom).every((id) => typeof id === "string")).toBe(true)
  })

  it("guards source reads to paths inside the catalog root", async () => {
    await expect(readCatalogSource(repoRoot, "../package.json")).rejects.toThrow(
      /escapes catalog root/,
    )
  })

  it("gives concept wiki entries readable categories and source paths", async () => {
    const catalog = await buildCatalog(repoRoot)
    const heart = catalog.nodes.find((node) => node.id === "concept.rta-heart")
    const appAnatomy = catalog.nodes.find((node) => node.id === "concept.app-anatomy")
    const boundedContext = catalog.nodes.find((node) => node.id === "vocab-symbol.BoundedContext")

    expect(heart?.metadata.category).toBe("Core Concepts")
    expect(heart?.description).toContain("humans, agents, tests")
    expect(heart?.source?.path).toBe("docs/concepts/rta-concepts.md")
    expect(Array.isArray(heart?.metadata.sections)).toBe(true)
    expect(appAnatomy?.metadata.category).toBe("App Structure")
    expect(boundedContext?.metadata.category).toBe("Domain Modeling")
    expect(boundedContext?.source?.path).toBe("packages/vocab/src/schemas/context.ts")
  })

  it("treats archetype declarations as blueprints instead of automatic tier-three vocabulary", async () => {
    const catalog = await buildCatalog(repoRoot)
    const archetypeSpec = catalog.nodes.find((node) => node.id === "vocab-symbol.ArchetypeSpec")
    const archetypeInstance = catalog.nodes.find((node) => node.id === "vocab-symbol.ArchetypeInstance")
    const blueprints = catalog.nodes.filter((node) => node.kind === "archetype")
    const blueprintInstances = catalog.nodes.filter((node) => node.kind === "archetype-instance")

    expect(archetypeSpec?.tier).toBeUndefined()
    expect(archetypeInstance?.tier).toBeUndefined()
    expect(blueprints.length).toBeGreaterThan(0)
    expect(blueprints.every((node) => node.tier === undefined)).toBe(true)
    expect(blueprints.every((node) => node.metadata.classification === "blueprint")).toBe(true)
    expect(blueprintInstances.every((node) => node.tier === undefined)).toBe(true)
    expect(blueprintInstances.every((node) => node.metadata.classification === "blueprint-instance")).toBe(true)
  })

  it("returns source-link overlays for RTA terms", async () => {
    const result = await sourceLinksForPath(repoRoot, "packages/vocab/src/schemas/tier.ts")

    expect(result.path).toBe("packages/vocab/src/schemas/tier.ts")
    expect(result.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "PatternSpec",
          targetId: "vocab-symbol.PatternSpec",
        }),
      ]),
    )
  })

  it("returns source-link overlays for runtime concepts", async () => {
    const result = await sourceLinksForPath(repoRoot, "packages/core/src/operation-scope.ts")

    expect(result.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "OperationScope",
          targetId: "vocab-symbol.OperationScope",
        }),
      ]),
    )
  })
})
