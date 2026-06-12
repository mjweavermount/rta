import { Effect } from "effect"
import { readFile, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { extname, join, relative, resolve } from "node:path"
import { parse as parseYaml } from "yaml"
import { readVocabFile, type VocabFile } from "@rta/vocab"

export type CatalogNodeKind =
  | "pattern"
  | "archetype"
  | "archetype-instance"
  | "context"
  | "aggregate"
  | "rule"
  | "decision"
  | "reaction"
  | "process-manager"
  | "boundary-schema"
  | "port"
  | "adapter-binding"
  | "tool-surface"
  | "deployment-intent"
  | "app-wiring"
  | "ard"
  | "source-file"
  | "concept"
  | "vocab-symbol"

export interface CatalogSourceRef {
  readonly path: string
  readonly startLine?: number
  readonly endLine?: number
}

export interface CatalogNode {
  readonly id: string
  readonly kind: CatalogNodeKind
  readonly name: string
  readonly tier?: "t1" | "t2" | "t3" | "extension"
  readonly scope?: string
  readonly description: string
  readonly path: string
  readonly source?: CatalogSourceRef
  readonly ards: string[]
  readonly checks: string[]
  readonly tests: string[]
  readonly inheritsFrom: string[]
  readonly usedBy: string[]
  readonly metadata: Record<string, unknown>
}

export interface CatalogSource {
  readonly path: string
  readonly language: string
  readonly text: string
  readonly lines: ReadonlyArray<{ readonly number: number; readonly text: string }>
}

export interface CatalogSourceLink {
  readonly line: number
  readonly startColumn: number
  readonly endColumn: number
  readonly text: string
  readonly targetKind: "catalog-node"
  readonly targetId: string
}

export interface Catalog {
  readonly root: string
  readonly generatedAt: string
  readonly nodes: CatalogNode[]
  readonly edges: ReadonlyArray<{
    readonly from: string
    readonly to: string
    readonly kind: string
  }>
}

interface ArdDoc {
  readonly id?: string
  readonly name?: string
  readonly status?: string
  readonly severity?: string
  readonly description?: string
  readonly checks?: ReadonlyArray<{ readonly description?: string; readonly command?: string }>
  readonly enforcement?: ReadonlyArray<{ readonly description?: string; readonly command?: string }>
  readonly decision?: string
  readonly spirit?: string | readonly string[]
  readonly letters?: string[]
}

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yaml",
  ".yml",
  ".md",
])

const languageForPath = (path: string): string => {
  switch (extname(path)) {
    case ".ts": return "ts"
    case ".tsx": return "tsx"
    case ".js":
    case ".mjs":
    case ".cjs": return "js"
    case ".jsx": return "jsx"
    case ".json": return "json"
    case ".yaml":
    case ".yml": return "yaml"
    case ".md": return "md"
    default: return "text"
  }
}

const isSemanticCatalogFixture = (relativePath: string): boolean =>
  relativePath.startsWith("fixtures/golden/fail/") ||
  relativePath.startsWith("packages/vocab/test/fixtures/")

const normalizeIdPart = (value: string): string =>
  value.trim().replace(/[^A-Za-z0-9_.:-]+/g, "-").replace(/^-+|-+$/g, "")

const normalizeStringList = (value: unknown): string[] => {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
  return []
}

const safeRelativePath = (root: string, requestedPath: string): string => {
  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(resolvedRoot, requestedPath)
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + "/")) {
    throw new Error(`Path escapes catalog root: ${requestedPath}`)
  }
  return relative(resolvedRoot, resolvedPath)
}

const discoverFiles = async (
  root: string,
  predicate: (relativePath: string) => boolean,
): Promise<string[]> => {
  const results: string[] = []
  const ignoredDirs = new Set([
    ".git",
    ".rta",
    ".rta-captures",
    ".rta-runtime",
    ".turbo",
    "coverage",
    "dist",
    "generated",
    "node_modules",
    "tmp",
  ])

  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue
        await walk(join(dir, entry.name))
        continue
      }
      if (!entry.isFile()) continue
      const absolutePath = join(dir, entry.name)
      const rel = relative(root, absolutePath)
      if (predicate(rel)) results.push(absolutePath)
    }
  }

  await walk(root)
  return results
}

const findFirstLine = async (absolutePath: string, needle: string): Promise<number | undefined> => {
  const text = await readFile(absolutePath, "utf8").catch(() => "")
  const idx = text.split(/\r?\n/).findIndex((line) => line.includes(needle))
  return idx >= 0 ? idx + 1 : undefined
}

const makeNode = (node: CatalogNode): CatalogNode => ({
  ...node,
  ards: [...node.ards],
  checks: [...node.checks],
  tests: [...node.tests],
  inheritsFrom: [...node.inheritsFrom],
  usedBy: [...node.usedBy],
})

const articleSourcePath = "docs/concepts/rta-concepts.md"

const concept = (node: {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly sections: ReadonlyArray<{ readonly title: string; readonly body: string }>
  readonly sourcePaths?: readonly string[]
  readonly ards?: string[]
  readonly checks?: string[]
  readonly tests?: string[]
  readonly inheritsFrom?: string[]
}): CatalogNode => makeNode({
  id: node.id,
  kind: "concept",
  name: node.name,
  description: node.description,
  path: articleSourcePath,
  source: { path: articleSourcePath },
  ards: node.ards ?? [],
  checks: node.checks ?? [],
  tests: node.tests ?? [],
  inheritsFrom: node.inheritsFrom ?? [],
  usedBy: [],
  metadata: {
    term: node.name,
    category: node.category,
    sections: node.sections,
    sourcePaths: node.sourcePaths ?? [],
  },
})

const vocabSymbol = (node: {
  readonly id: string
  readonly name: string
  readonly tier?: "t1" | "t2" | "t3" | "extension"
  readonly category: string
  readonly description: string
  readonly path: string
  readonly ards?: string[]
  readonly checks?: string[]
  readonly tests?: string[]
  readonly inheritsFrom?: string[]
  readonly term?: string
}): CatalogNode => makeNode({
  id: node.id.replace(/^concept\./, "vocab-symbol."),
  kind: "vocab-symbol",
  name: node.name,
  tier: node.tier,
  description: node.description,
  path: node.path,
  source: { path: node.path },
  ards: node.ards ?? [],
  checks: node.checks ?? [],
  tests: node.tests ?? [],
  inheritsFrom: (node.inheritsFrom ?? []).map((id) => id.replace(/^concept\./, "vocab-symbol.")),
  usedBy: [],
  metadata: {
    term: node.term ?? node.name,
    category: node.category,
  },
})

const conceptNodes: CatalogNode[] = [
  concept({
    category: "Core Concepts",
    id: "concept.rta-heart",
    name: "RTA Heart",
    description: "RTA is a way to make app behavior explicit enough for humans, agents, tests, and generated runtime code to share one model.",
    sourcePaths: ["README.md", "docs/rta-production-authoring-platform-spec.md"],
    sections: [
      {
        title: "What RTA is for",
        body: "RTA treats an application as a living vocabulary plus a set of enforceable records. The point is not to hide code behind diagrams; the point is to keep domain language, runtime behavior, source files, tests, and operator evidence connected.",
      },
      {
        title: "The working promise",
        body: "If a concept matters, it should have a name, a source path, a check or test when possible, and enough prose that a human can decide whether the generated or authored code still matches the idea.",
      },
    ],
  }),
  concept({
    category: "Core Concepts",
    id: "concept.authoring-loop",
    name: "Authoring Loop",
    description: "The normal RTA loop is declare, generate or wire, run checks, inspect evidence, then promote useful language upstream.",
    sourcePaths: ["packages/cli/src/check.ts", "docs/rta-production-authoring-platform-spec.md"],
    sections: [
      {
        title: "Declare before wiring",
        body: "RTA prefers explicit declarations for boundaries, ports, app wiring, and runtime intent. That gives the generator and checker something stable to compare against implementation work.",
      },
      {
        title: "Evidence closes the loop",
        body: "A declaration is not done because it exists. It becomes useful when a check, test, scenario, generated file, or operator-visible log proves that the declaration still describes reality.",
      },
    ],
  }),
  concept({
    category: "Core Concepts",
    id: "concept.vocabulary-ladder",
    name: "Vocabulary Ladder",
    description: "Core vocab starts small, extensions try local language, and useful extensions can be hoisted upward after they prove themselves.",
    sourcePaths: ["packages/vocab/src/schemas/tier.ts", "ards/t2/tier-vocab-catalog.ard.json"],
    sections: [
      {
        title: "Tiers",
        body: "T1 is the durable core, T2 captures reusable specializations, and T3 is optional: it only exists when a concrete reusable item honestly reads as T3 is-a T2 is-a T1. Larger app shapes are blueprints or compositions unless they prove that inheritance relationship.",
      },
      {
        title: "Hoisting",
        body: "App-specific vocabulary is allowed. The important constraint is that promotion should be deliberate, documented, and checked so the core language does not become a junk drawer.",
      },
    ],
    ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
  }),
  concept({
    category: "Core Concepts",
    id: "concept.ddd-inspiration",
    name: "DDD Inspiration",
    description: "RTA borrows DDD language such as bounded contexts, aggregates, ports, and repositories, but uses it as an inspectable app contract rather than a ceremony.",
    sourcePaths: ["packages/vocab/src/schemas/context.ts", "packages/vocab/src/schemas/aggregate.ts"],
    sections: [
      {
        title: "Boundaries over buzzwords",
        body: "The useful part of DDD here is boundary discipline: one model owns one language, and integration happens through explicit contracts instead of informal shared state.",
      },
      {
        title: "Practical adaptation",
        body: "RTA keeps the DDD words only when they help with generation, testing, logging, or human review. If a term cannot pull its weight in the repo, it should remain prose rather than framework machinery.",
      },
    ],
  }),
  concept({
    category: "Core Concepts",
    id: "concept.primitives-patterns-archetypes",
    name: "Primitives, Patterns, And Blueprints",
    description: "RTA vocabulary grows from durable primitives into reusable specializations; larger app shapes compose those parts as blueprints.",
    sourcePaths: ["packages/vocab/src/schemas/tier.ts", "fixtures/golden/pass/patterns"],
    sections: [
      {
        title: "Patterns",
        body: "A pattern is a reusable language unit with required primitives and a testing contract. It should be specific enough to generate or check but broad enough to reuse.",
      },
      {
        title: "Blueprints",
        body: "A blueprint composes several vocabulary items into a larger shape, such as a whole app capability or recurring integration style. Current ArchetypeSpec files are treated as this compatibility blueprint layer unless they prove a true tier specialization.",
      },
    ],
  }),
  concept({
    category: "Core Concepts",
    id: "concept.extensions-and-upstreaming",
    name: "Extensions And Upstreaming",
    description: "Extensions let apps invent local vocabulary without forcing every experiment into the core system.",
    sourcePaths: ["ards/t2/tier-blooming-spirit.ard.json", "ards/t2/tier-obligation-inheritance.ard.json"],
    sections: [
      {
        title: "Local first",
        body: "A new app can declare the terms it needs near the app. That keeps experiments cheap and avoids pretending every local phrase is already platform language.",
      },
      {
        title: "Promotion path",
        body: "When an extension shows up repeatedly, gets tests, and has a stable meaning, it can move up the ladder. The promotion should preserve provenance so readers can see where the idea came from.",
      },
    ],
    ards: ["ARD-T2-TIER-BLOOMING-SPIRIT", "ARD-T2-TIER-OBLIGATION-INHERITANCE"],
  }),
  concept({
    category: "App Structure",
    id: "concept.app-anatomy",
    name: "App Anatomy",
    description: "An RTA app is a bundle of contexts, operations, boundaries, runtime adapters, tests, demos, and publication evidence.",
    sourcePaths: ["packages/vocab/src/schemas/wiring.ts", "examples"],
    sections: [
      {
        title: "Inside the app",
        body: "The app owns domain vocab and app wiring. It may expose CLI, MCP, HTTP, worker, or scheduled surfaces, but those surfaces should map back to declared model operations.",
      },
      {
        title: "Outside the app",
        body: "Deployment, runtime secrets, and hosting details are adapter concerns. The app can ask for capabilities, but the platform decides how to satisfy them.",
      },
    ],
  }),
  concept({
    category: "App Structure",
    id: "concept.entry-points-and-wiring",
    name: "Entry Points And Wiring",
    description: "Entry points connect external callers to declared operations through app wiring, tool surfaces, deployment intent, and adapter bindings.",
    sourcePaths: ["packages/vocab/src/schemas/wiring.ts", "packages/vocab/src/schemas/capability.ts"],
    sections: [
      {
        title: "Entry points",
        body: "An entry point is how work enters the app: a command, query, event handler, CLI subcommand, MCP tool, HTTP endpoint, or scheduled job.",
      },
      {
        title: "Wiring",
        body: "Wiring names the route from entry point to operation and from operation to runtime dependencies. This makes generated files reviewable instead of magical.",
      },
    ],
  }),
  concept({
    category: "App Structure",
    id: "concept.boundaries-ports-adapters-dtos",
    name: "Boundaries, Ports, Adapters, And DTOs",
    description: "Boundaries define what crosses into and out of the model; ports ask for capabilities; adapters fulfill those capabilities; DTOs carry explicit payloads.",
    sourcePaths: ["packages/vocab/src/schemas/boundary.ts", "ards/boundary"],
    sections: [
      {
        title: "Boundary payloads",
        body: "Anything crossing an app boundary should have a declared shape. That gives sanitization, validation, logging, and docs a concrete object to inspect.",
      },
      {
        title: "Ports and adapters",
        body: "Ports describe what the model needs. Adapters bind those needs to a runtime implementation such as a file store, API client, MCP tool, or database.",
      },
    ],
    ards: ["ARD-BOUNDARY-DTOS-ARE-BOUNDARY-SCHEMAS", "ARD-BOUNDARY-PORTS-DECLARE-CAPABILITIES"],
  }),
  concept({
    category: "App Structure",
    id: "concept.cqrs-and-domain-flow",
    name: "CQRS And Domain Flow",
    description: "RTA keeps commands, queries, events, reactions, and process managers separate enough to trace how a model moves.",
    sourcePaths: ["packages/vocab/src/schemas/policy.ts", "packages/strict/src/connection-map.ts"],
    sections: [
      {
        title: "Commands and queries",
        body: "Commands ask the model to change state. Queries ask for a view. Keeping them distinct makes demos, tests, and operation logs easier to reason about.",
      },
      {
        title: "Events and policy",
        body: "Events describe what happened. Reactions and process managers describe what should happen next, without forcing all orchestration into one handler.",
      },
    ],
  }),
  concept({
    category: "App Structure",
    id: "concept.repositories-and-state",
    name: "Repositories And State",
    description: "Repositories keep storage choices outside the model while making stateful behavior visible enough to test and restore.",
    sourcePaths: ["packages/core/src/repository.ts", "packages/runtime/src/repository.ts"],
    sections: [
      {
        title: "Repository boundary",
        body: "A repository is not just a database helper. It is the contract between model behavior and durable state.",
      },
      {
        title: "Runtime adapters",
        body: "File-backed and other adapters are allowed as long as they stay behind the declared port. That keeps local demos and production deployments on the same conceptual path.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.security-and-sanitization",
    name: "Security And Sanitization",
    description: "RTA wants boundary validation and sanitization to be declared, testable, and visible in the generated and runtime surfaces.",
    sourcePaths: ["packages/core/src/edge-boundary.ts", "packages/runtime/src/edge-boundary.ts"],
    sections: [
      {
        title: "Edge boundaries",
        body: "External input should enter through an explicit edge boundary. The boundary validates and normalizes before the model sees the payload.",
      },
      {
        title: "Auditable failure",
        body: "Rejected input should be boring and inspectable: clear failure shape, consistent operation scope, and enough logging for operators to understand the boundary decision.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.id-story-and-branded-fittings",
    name: "ID Story And Branded Fittings",
    description: "Identifiers and branded fittings make generated code readable and keep cross-boundary references from becoming anonymous strings.",
    sourcePaths: ["docs/rta-id-story-and-ard-cleanup.md", "packages/core/src"],
    sections: [
      {
        title: "Why IDs matter",
        body: "Stable IDs let catalog pages, source links, ARDs, tests, and generated files point at the same thing.",
      },
      {
        title: "Branded fittings",
        body: "A branded fitting is a small type-level guardrail around a meaningful identifier or runtime value. It keeps accidental string mixing from leaking into the model.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.effect-ts-runtime",
    name: "Effect TS Runtime",
    description: "Effect provides the runtime vocabulary for dependencies, layers, managed execution, and typed failure paths.",
    sourcePaths: ["docs/rta-pure-ts-effect-migration.md", "packages/runtime/src"],
    sections: [
      {
        title: "Layers",
        body: "Layers are how runtime capabilities are assembled. RTA uses them so generated operations can ask for services without constructing the world directly.",
      },
      {
        title: "Typed execution",
        body: "Effect lets operations describe success, failure, dependencies, and tracing in one runtime model. That makes generated code easier to instrument and test.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.cli-and-generators",
    name: "CLI And Generators",
    description: "The CLI is the operator surface for checking declarations, generating runtime code, serving the catalog, and running demos.",
    sourcePaths: ["packages/cli/src/index.ts", "packages/cli/src/generate"],
    sections: [
      {
        title: "CLI as workbench",
        body: "The CLI should make the repo inspectable: build catalogs, run checks, generate runtime files, and expose local APIs for demos.",
      },
      {
        title: "Generator contract",
        body: "Generated files should be reproducible leaves. If a generated file is edited by hand, that is usually a smell that the declaration or generator needs to change.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.ards-and-enforcement",
    name: "ARDs And Enforcement",
    description: "ARDs turn design decisions into inspectable records with explicit checks, severity, and source connections.",
    sourcePaths: ["ards", "packages/cli/src/check-specs.ts"],
    sections: [
      {
        title: "Decision records",
        body: "An ARD explains why a rule exists and how the repo knows whether the rule is still honored.",
      },
      {
        title: "Checks",
        body: "The best ARDs point to commands or tests. Prose is useful, but enforcement keeps architecture from drifting into folklore.",
      },
    ],
  }),
  concept({
    category: "Generation And Enforcement",
    id: "concept.tests-scenarios-and-coverage",
    name: "Tests, Scenarios, And Coverage",
    description: "Tests cover code, scenarios cover behavior, and catalog evidence connects both back to vocabulary and ARDs.",
    sourcePaths: ["packages/cli/test", "docs/demos/rta-demo-coverage-map.md"],
    sections: [
      {
        title: "Scenario captures",
        body: "Scenario captures are proof that a flow can run in a repeatable way. They should be easy to inspect, not hidden behind one green check.",
      },
      {
        title: "Coverage map",
        body: "Coverage means more than line coverage here. It means knowing which vocab, app wiring, records, and source paths have been exercised.",
      },
    ],
  }),
  concept({
    category: "Runtime And Operations",
    id: "concept.work-ledger-and-demo-contract",
    name: "Work Ledger And Demo Contract",
    description: "The work ledger and demo contract make demonstrations repeatable enough for humans and agents to trust.",
    sourcePaths: ["docs/rta-production-authoring-platform-spec.md", "docs/demos"],
    sections: [
      {
        title: "Demo contract",
        body: "A demo should say what it proves, what data it touches, how to reset it, and what a human should observe.",
      },
      {
        title: "Work ledger",
        body: "The ledger is the operator memory of what ran, what changed, and what evidence was captured. It is the bridge between ad hoc demo work and durable review.",
      },
    ],
  }),
  concept({
    category: "Runtime And Operations",
    id: "concept.operation-events-and-readable-logs",
    name: "Operation Events And Readable Logs",
    description: "Operation events and readable logs are the runtime story for what happened, why, and under whose operation scope.",
    sourcePaths: ["packages/core/src/operation-scope.ts", "packages/strict/src/readable-log.ts"],
    sections: [
      {
        title: "Operation scope",
        body: "Operation scope carries actor, correlation, causation, timing, and identity through a run. It is how runtime work becomes traceable.",
      },
      {
        title: "Readable logs",
        body: "Readable logs are for operators and reviewers. They should make the flow understandable without requiring a debugger.",
      },
    ],
  }),
  concept({
    category: "Runtime And Operations",
    id: "concept.jobs-flows-and-schedulers",
    name: "Jobs, Flows, And Schedulers",
    description: "Scheduled and asynchronous work should still enter through declared operations and leave observable evidence.",
    sourcePaths: ["packages/vocab/src/schemas/deployment.ts", "packages/cli/src"],
    sections: [
      {
        title: "Jobs are entry points",
        body: "A scheduled job is not a side door. It should map to a declared operation with the same scope, logging, and boundary discipline as an HTTP or MCP call.",
      },
      {
        title: "Flows",
        body: "Flows compose operations over time. RTA should keep enough state and events around a flow that a human can explain what happened afterward.",
      },
    ],
  }),
  concept({
    category: "Runtime And Operations",
    id: "concept.monitoring-and-provenance",
    name: "Monitoring And Provenance",
    description: "RTA should expose where data came from, which declarations shaped behavior, and what evidence exists for a run.",
    sourcePaths: ["packages/cli/src/serve.ts", "docs/rta-production-authoring-platform-spec.md"],
    sections: [
      {
        title: "Provenance",
        body: "Every catalog entry should be able to point back to source, ARDs, checks, tests, or runtime evidence. That is what makes the wiki more than a static docs page.",
      },
      {
        title: "Monitoring",
        body: "Monitoring should connect runtime symptoms to declared concepts. A failing adapter, boundary, or app surface should be visible in terms the app contract already uses.",
      },
    ],
  }),
  concept({
    category: "Proving Apps And Examples",
    id: "concept.deployment-adapters",
    name: "Deployment Adapters",
    description: "Deployment adapters connect host-neutral app intent to concrete environments without forcing infra details into the model.",
    sourcePaths: ["packages/vocab/src/schemas/deployment.ts", "ards/boundary/runtime-hosting-is-adapter.ard.json"],
    sections: [
      {
        title: "Intent first",
        body: "The app declares what it needs: a web surface, worker, schedule, secret, store, or tool. The adapter decides whether that becomes Kubernetes, local Node, a lab service, or another host.",
      },
      {
        title: "Reviewable output",
        body: "Adapters should leave generated output and catalog evidence so operators can see exactly what hosting shape was selected.",
      },
    ],
  }),
  concept({
    category: "Proving Apps And Examples",
    id: "concept.mcp-and-affine-apps",
    name: "MCP And AFFiNE Apps",
    description: "MCP and AFFiNE integrations prove that RTA can expose useful agent-facing tools while keeping app boundaries explicit.",
    sourcePaths: ["docs/rta-mcp-affine-artifact-vocab.md", "docs/rta-markdown-affine-projection.md"],
    sections: [
      {
        title: "MCP surface",
        body: "An MCP surface is a tool-facing entry point. It should be described like any other tool surface: inputs, outputs, actor, credentials, and runtime boundary.",
      },
      {
        title: "AFFiNE projection",
        body: "AFFiNE is a proving ground for document projection and agent-operated content. RTA should keep source custody clear while exposing useful document operations.",
      },
    ],
  }),
  concept({
    category: "Proving Apps And Examples",
    id: "concept.meeting-digest-proving-app",
    name: "Meeting Digest Proving App",
    description: "A meeting digest app would turn transcripts into raw records, summaries, todos, and topic maps while preserving provenance.",
    sourcePaths: ["docs/rta-production-authoring-platform-spec.md"],
    sections: [
      {
        title: "Raw first",
        body: "The raw transcript should be stored as received. Derived summaries, todos, mind maps, and decisions should point back to the transcript source.",
      },
      {
        title: "Two threads",
        body: "There are likely two related tools: one for faithful meeting digestion and one for live brainstorming. They can share vocab but should not pretend to have the same evidence requirements.",
      },
    ],
  }),
  concept({
    category: "Proving Apps And Examples",
    id: "concept.agent-experience",
    name: "Agent Experience",
    description: "RTA should help agents inspect the app contract, find source, run checks, and create useful changes without depending on chat memory.",
    sourcePaths: ["packages/cli/src/catalog.ts", "packages/cli/src/serve.ts"],
    sections: [
      {
        title: "Navigable context",
        body: "Agents need concise entry points, source links, tests, and records. The catalog should make the next good inspection step obvious.",
      },
      {
        title: "Safe action",
        body: "A useful agent surface should separate read-only exploration from mutations, and mutations should be backed by checks and human-reviewable evidence.",
      },
    ],
  }),
]

const vocabReferenceNodes: CatalogNode[] = [
  vocabSymbol({
    category: "Vocabulary Ladder",
    name: "PatternSpec",
    id: "concept.PatternSpec",
    tier: "t2",
    description: "A reusable tier-two vocabulary pattern with required primitives, testing contract, visual concepts, and narrative label.",
    path: "packages/vocab/src/schemas/tier.ts",
    ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
    checks: ["rta check --tier-contracts"],
    tests: ["packages/vocab/test/parse.test.ts"],
  }),
  vocabSymbol({
    category: "Vocabulary Ladder",
    name: "ArchetypeSpec",
    id: "concept.ArchetypeSpec",
    description: "Current compatibility declaration for a reusable blueprint or composition with named roles, a test plan, and visual guidance.",
    path: "packages/vocab/src/schemas/tier.ts",
    ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
    checks: ["rta check --tier-contracts"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.PatternSpec"],
  }),
  vocabSymbol({
    category: "Vocabulary Ladder",
    name: "ArchetypeInstance",
    id: "concept.ArchetypeInstance",
    description: "A concrete binding of a compatibility blueprint to context events and role names.",
    path: "packages/vocab/src/schemas/tier.ts",
    ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
    checks: ["rta check --tier-contracts"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.ArchetypeSpec"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "BoundedContext",
    id: "concept.BoundedContext",
    tier: "t1",
    description: "A named model boundary that owns its language, aggregates, rules, ports, and integration contracts.",
    path: "packages/vocab/src/schemas/context.ts",
    checks: ["rta check --production"],
    tests: ["packages/vocab/test/parse.test.ts"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "Aggregate",
    id: "concept.Aggregate",
    tier: "t1",
    description: "A consistency boundary around commands, events, entities, values, rules, and decisions for one domain lifecycle.",
    path: "packages/vocab/src/schemas/aggregate.ts",
    checks: ["rta check --production"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.BoundedContext"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "Rule",
    id: "concept.Rule",
    tier: "t1",
    description: "A named invariant that evaluates input or aggregate state and explains the violation it prevents.",
    path: "packages/vocab/src/schemas/rule.ts",
    checks: ["rta check --rule-shapes", "rta check --obligation-coverage"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.Aggregate"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "Decision",
    id: "concept.Decision",
    tier: "t1",
    description: "A named branching choice in the model, usually used to route lifecycle behavior or state transitions.",
    path: "packages/vocab/src/schemas/decision.ts",
    checks: ["rta check --decision-shapes", "rta check --obligation-coverage"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.Aggregate"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "Reaction",
    id: "concept.Reaction",
    tier: "t1",
    description: "A stateless event reaction that listens for one event and emits commands into another context or aggregate.",
    path: "packages/vocab/src/schemas/policy.ts",
    checks: ["rta check --operation-event"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.ConnectionMap"],
  }),
  vocabSymbol({
    category: "Domain Modeling",
    name: "ProcessManager",
    id: "concept.ProcessManager",
    tier: "t2",
    description: "A stateful policy that advances through transitions as events arrive and may emit follow-up commands.",
    path: "packages/vocab/src/schemas/policy.ts",
    checks: ["rta check --obligation-coverage"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.Reaction"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "BoundarySchema",
    id: "concept.BoundarySchema",
    tier: "t2",
    description: "A declared DTO/schema at the edge of a context, used to keep boundary payloads explicit and sanitized.",
    path: "packages/vocab/src/schemas/boundary.ts",
    ards: ["ARD-BOUNDARY-DTOS-ARE-BOUNDARY-SCHEMAS"],
    checks: ["rta check --boundary-sanitization"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.BoundedContext"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "Port",
    id: "concept.Port",
    tier: "t2",
    description: "A capability-facing contract that says what a context needs from the outside world without choosing an adapter.",
    path: "packages/vocab/src/schemas/boundary.ts",
    ards: ["ARD-BOUNDARY-PORTS-DECLARE-CAPABILITIES"],
    checks: ["rta check --production"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.BoundedContext"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "AdapterBinding",
    id: "concept.AdapterBinding",
    tier: "t2",
    description: "A binding from a declared port to a runtime adapter, keeping hosting details outside the domain language.",
    path: "packages/vocab/src/schemas/boundary.ts",
    ards: ["ARD-BOUNDARY-PORTS-DECLARE-CAPABILITIES"],
    checks: ["rta check --production"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.Port"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "ToolSurface",
    id: "concept.ToolSurface",
    tier: "t2",
    description: "A declared tool-facing surface, such as CLI or MCP, that exposes model operations through a controlled interface.",
    path: "packages/vocab/src/schemas/capability.ts",
    checks: ["rta check --production"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.BoundarySchema"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "DeploymentIntent",
    id: "concept.DeploymentIntent",
    tier: "t2",
    description: "A description of how a model wants to be hosted, scheduled, or run without hard-coding infrastructure machinery.",
    path: "packages/vocab/src/schemas/deployment.ts",
    ards: ["ARD-RUNTIME-HOSTING-IS-ADAPTER"],
    checks: ["rta check --deployment-contract"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.AdapterBinding"],
  }),
  vocabSymbol({
    category: "Boundary And Integration",
    name: "AppWiring",
    id: "concept.AppWiring",
    tier: "t2",
    description: "The app-level entrypoint map connecting operations, schemas, surfaces, adapter bindings, and demos.",
    path: "packages/vocab/src/schemas/wiring.ts",
    checks: ["rta check --app-wiring"],
    tests: ["packages/vocab/test/parse.test.ts"],
    inheritsFrom: ["concept.ToolSurface", "concept.DeploymentIntent"],
  }),
  vocabSymbol({
    category: "Runtime And Observability",
    name: "OperationScope",
    id: "concept.OperationScope",
    tier: "t1",
    description: "Canonical execution context that carries issuedBy, correlation, causation, timing, and operation identity through runtime work.",
    path: "packages/core/src/operation-scope.ts",
    ards: ["ARD-RUNTIME-EXECUTION-ID-ENVELOPE"],
    checks: ["rta check --trace-context"],
    tests: ["packages/core/test/operation-scope.test.ts"],
  }),
  vocabSymbol({
    category: "Runtime And Observability",
    name: "ConnectionMap",
    id: "concept.ConnectionMap",
    tier: "t1",
    description: "Runtime service that governs whether events may publish or subscribe across context boundaries.",
    path: "packages/strict/src/connection-map.ts",
    ards: ["ARD-RUNTIME-STRICT-CQRS"],
    checks: ["rta check --production"],
    tests: ["packages/strict/test/connection-map.test.ts"],
  }),
  vocabSymbol({
    category: "Runtime And Observability",
    name: "InstrumentedPrimitive",
    id: "concept.InstrumentedPrimitive",
    tier: "t1",
    description: "A primitive operation wrapped with the metadata and hooks needed for consistent execution logs and traces.",
    path: "packages/strict/src/primitive.ts",
    checks: ["rta check --operation-event"],
    tests: ["packages/strict/test/primitive.test.ts"],
    inheritsFrom: ["concept.OperationScope"],
  }),
  vocabSymbol({
    category: "Runtime And Observability",
    name: "ReadableLog",
    id: "concept.ReadableLog",
    tier: "t1",
    description: "Human-readable runtime events emitted beside machine traces so operators can understand what happened.",
    path: "packages/strict/src/readable-log.ts",
    checks: ["rta check --telemetry"],
    tests: ["packages/strict/test/readable-log.test.ts"],
    inheritsFrom: ["concept.InstrumentedPrimitive"],
  }),
  vocabSymbol({
    category: "Runtime And Observability",
    name: "OperationEvent",
    id: "concept.OperationEvent",
    tier: "t1",
    description: "A lifecycle event around an operation, used to make execution flow observable and testable.",
    path: "packages/strict/src/lifecycle.ts",
    checks: ["rta check --operation-event"],
    tests: ["packages/strict/test/lifecycle.test.ts"],
    inheritsFrom: ["concept.OperationScope"],
  }),
  vocabSymbol({
    category: "Persistence And Safety",
    name: "Repository",
    id: "concept.Repository",
    tier: "t1",
    description: "A persistence boundary that exposes save/load behavior without letting callers know storage details.",
    path: "packages/core/src/repository.ts",
    checks: ["rta check --production"],
    tests: ["packages/core/test/repository.test.ts"],
    inheritsFrom: ["concept.AdapterBinding"],
  }),
  vocabSymbol({
    category: "Persistence And Safety",
    name: "FileBackedRepository",
    id: "concept.FileBackedRepository",
    tier: "extension",
    description: "A runtime repository adapter backed by files, useful for local demos and deterministic operator-visible state.",
    path: "packages/runtime/src/repository.ts",
    checks: ["rta check --production"],
    tests: ["packages/runtime/test/repository.test.ts"],
    inheritsFrom: ["concept.Repository"],
  }),
  vocabSymbol({
    category: "Persistence And Safety",
    name: "EdgeBoundary",
    id: "concept.EdgeBoundary",
    tier: "t1",
    description: "A runtime boundary helper for accepting external input, validating it, and entering the model deliberately.",
    path: "packages/core/src/edge-boundary.ts",
    checks: ["rta check --boundary-sanitization"],
    tests: ["packages/core/test/edge-boundary.test.ts"],
    inheritsFrom: ["concept.BoundarySchema"],
  }),
  vocabSymbol({
    category: "Persistence And Safety",
    name: "Secret",
    id: "concept.Secret",
    tier: "t1",
    description: "A typed secret reference that keeps sensitive values out of vocabulary declarations and generated source.",
    path: "packages/core/src/secret.ts",
    checks: ["rta check --production"],
    tests: ["packages/core/test/secret.test.ts"],
    inheritsFrom: ["concept.AdapterBinding"],
  }),
]

const collectVocabNodes = async (root: string): Promise<CatalogNode[]> => {
  const vocabFiles = await discoverFiles(root, (rel) =>
    (rel.endsWith(".yaml") || rel.endsWith(".yml")) &&
    !rel.endsWith(".ard.yaml") &&
    !isSemanticCatalogFixture(rel),
  )
  const nodes: CatalogNode[] = []

  for (const absolutePath of vocabFiles) {
    const rel = relative(root, absolutePath)
    const parsed = await Effect.runPromise(
      readVocabFile(absolutePath).pipe(Effect.either),
    )
    if (parsed._tag === "Left") continue
    const v: VocabFile = parsed.right

    if (v.kind === "PatternSpec") {
      nodes.push(makeNode({
        id: `pattern.${v.name}`,
        kind: "pattern",
        name: v.name,
        tier: "t2",
        description: v.description,
        path: rel,
        source: { path: rel, startLine: await findFirstLine(absolutePath, v.name) },
        ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
        checks: ["rta check --tier-contracts"],
        tests: [],
        inheritsFrom: [v.testingContract.extends],
        usedBy: [],
        metadata: {
          requiredPrimitives: v.requiredPrimitives,
          vocabHint: v.vocabHint,
          visualConcepts: v.visualConcepts,
          narrativeLabel: v.narrativeLabel,
          testingContract: v.testingContract,
        },
      }))
    }

    if (v.kind === "ArchetypeSpec") {
      nodes.push(makeNode({
        id: `archetype.${v.name}`,
        kind: "archetype",
        name: v.name,
        description: v.description,
        path: rel,
        source: { path: rel, startLine: await findFirstLine(absolutePath, v.name) },
        ards: ["ARD-T2-TIER-VOCAB-CATALOG", "ARD-T2-TIER-CONTRACT-GATE"],
        checks: ["rta check --tier-contracts"],
        tests: [],
        inheritsFrom: v.requiredPatterns.map((name) => `pattern.${name}`),
        usedBy: [],
        metadata: {
          classification: "blueprint",
          requiredPatterns: v.requiredPatterns,
          inputRoles: v.inputRoles,
          outputRoles: v.outputRoles,
          testPlan: v.testPlan,
          visualGuidance: v.visualGuidance,
          narrativeLabel: v.narrativeLabel,
        },
      }))
    }

    if (v.kind === "ArchetypeInstance") {
      nodes.push(makeNode({
        id: `archetype-instance.${v.context}.${v.archetype}`,
        kind: "archetype-instance",
        name: `${v.context}:${v.archetype}`,
        scope: v.context,
        description: v.description ?? `Binding of ${v.archetype} into ${v.context}.`,
        path: rel,
        source: { path: rel, startLine: await findFirstLine(absolutePath, v.archetype) },
        ards: ["ARD-T2-TIER-CONTRACT-GATE"],
        checks: ["rta check --tier-contracts"],
        tests: [],
        inheritsFrom: [`archetype.${v.archetype}`],
        usedBy: [],
        metadata: { classification: "blueprint-instance", bindings: v.bindings },
      }))
    }

    if (v.kind === "BoundedContext") {
      const contextId = `context.${v.name}`
      nodes.push(makeNode({
        id: contextId,
        kind: "context",
        name: v.name,
        scope: v.name,
        description: v.description ?? `${v.name} bounded context.`,
        path: rel,
        source: { path: rel, startLine: await findFirstLine(absolutePath, v.name) },
        ards: [],
        checks: ["rta check --production"],
        tests: [],
        inheritsFrom: [],
        usedBy: [],
        metadata: { classification: v.classification, guidance: v.guidance ?? null },
      }))

      for (const aggregate of v.aggregates ?? []) {
        const aggregateId = `${contextId}.aggregate.${aggregate.name}`
        nodes.push(makeNode({
          id: aggregateId,
          kind: "aggregate",
          name: aggregate.name,
          scope: v.name,
          description: aggregate.description ?? `${aggregate.name} aggregate in ${v.name}.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, aggregate.name) },
          ards: [],
          checks: ["rta check --production"],
          tests: [],
          inheritsFrom: [contextId],
          usedBy: [],
          metadata: {},
        }))
        for (const rule of aggregate.rules ?? []) {
          nodes.push(makeNode({
            id: `${aggregateId}.rule.${rule.name}`,
            kind: "rule",
            name: rule.name,
            scope: v.name,
            description: rule.description ?? `${rule.name} rule.`,
            path: rel,
            source: { path: rel, startLine: await findFirstLine(absolutePath, rule.name) },
            ards: [],
            checks: ["rta check --obligation-coverage", "rta check --rule-shapes"],
            tests: [],
            inheritsFrom: [aggregateId, ...(rule.pattern ? [`pattern.${rule.pattern}`] : [])],
            usedBy: [],
            metadata: { pattern: rule.pattern ?? null, implementation: rule.implementation ?? null },
          }))
        }
        for (const decision of aggregate.decisions ?? []) {
          nodes.push(makeNode({
            id: `${aggregateId}.decision.${decision.name}`,
            kind: "decision",
            name: decision.name,
            scope: v.name,
            description: decision.description ?? `${decision.name} decision.`,
            path: rel,
            source: { path: rel, startLine: await findFirstLine(absolutePath, decision.name) },
            ards: [],
            checks: ["rta check --obligation-coverage", "rta check --decision-shapes"],
            tests: [],
            inheritsFrom: [aggregateId, ...(decision.pattern ? [`pattern.${decision.pattern}`] : [])],
            usedBy: [],
            metadata: { pattern: decision.pattern ?? null, implementation: decision.implementation ?? null },
          }))
        }
      }

      for (const decision of v.decisions ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.decision.${decision.name}`,
          kind: "decision",
          name: decision.name,
          scope: v.name,
          description: decision.description ?? `${decision.name} decision.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, decision.name) },
          ards: [],
          checks: ["rta check --obligation-coverage", "rta check --decision-shapes"],
          tests: [],
          inheritsFrom: [contextId, ...(decision.pattern ? [`pattern.${decision.pattern}`] : [])],
          usedBy: [],
          metadata: { pattern: decision.pattern ?? null, implementation: decision.implementation ?? null },
        }))
      }

      for (const processManager of v.processManagers ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.process-manager.${processManager.name}`,
          kind: "process-manager",
          name: processManager.name,
          scope: v.name,
          description: processManager.description ?? `${processManager.name} process manager.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, processManager.name) },
          ards: [],
          checks: ["rta check --obligation-coverage"],
          tests: [],
          inheritsFrom: [contextId, ...(processManager.pattern ? [`pattern.${processManager.pattern}`] : [])],
          usedBy: [],
          metadata: { pattern: processManager.pattern ?? null, implementation: processManager.implementation ?? null },
        }))
      }

      for (const schema of v.boundarySchemas ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.boundary-schema.${schema.name}`,
          kind: "boundary-schema",
          name: schema.name,
          scope: v.name,
          description: schema.description ?? `${schema.name} boundary schema.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, schema.name) },
          ards: ["ARD-BOUNDARY-DTOS-ARE-BOUNDARY-SCHEMAS"],
          checks: ["rta check --boundary-sanitization"],
          tests: [],
          inheritsFrom: [contextId, "pattern.boundary-schema"],
          usedBy: [],
          metadata: schema,
        }))
      }

      for (const port of v.ports ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.port.${port.name}`,
          kind: "port",
          name: port.name,
          scope: v.name,
          description: port.description ?? `${port.name} port.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, port.name) },
          ards: ["ARD-BOUNDARY-PORTS-DECLARE-CAPABILITIES"],
          checks: ["rta check --production"],
          tests: [],
          inheritsFrom: [contextId, "pattern.port-contract"],
          usedBy: [],
          metadata: port,
        }))
      }

      for (const binding of v.adapterBindings ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.adapter-binding.${binding.name}`,
          kind: "adapter-binding",
          name: binding.name,
          scope: v.name,
          description: binding.description ?? `${binding.name} adapter binding.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, binding.name) },
          ards: ["ARD-BOUNDARY-PORTS-DECLARE-CAPABILITIES"],
          checks: ["rta check --production"],
          tests: [],
          inheritsFrom: [contextId, "pattern.adapter-binding"],
          usedBy: [],
          metadata: binding,
        }))
      }

      for (const surface of v.toolSurfaces ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.tool-surface.${surface.name}`,
          kind: "tool-surface",
          name: surface.name,
          scope: v.name,
          description: surface.description ?? `${surface.name} tool surface.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, surface.name) },
          ards: [],
          checks: ["rta check --production"],
          tests: [],
          inheritsFrom: [contextId, "pattern.tool-surface"],
          usedBy: [],
          metadata: surface,
        }))
      }

      for (const intent of v.deploymentIntents ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.deployment-intent.${intent.name}`,
          kind: "deployment-intent",
          name: intent.name,
          scope: v.name,
          description: intent.description ?? `${intent.name} deployment intent.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, intent.name) },
          ards: ["ARD-RUNTIME-HOSTING-IS-ADAPTER"],
          checks: ["rta check --deployment-contract"],
          tests: [],
          inheritsFrom: [contextId, "pattern.deployment-intent"],
          usedBy: [],
          metadata: intent,
        }))
      }

      if (v.appWiring) {
        nodes.push(makeNode({
          id: `${contextId}.app-wiring.${v.appWiring.name}`,
          kind: "app-wiring",
          name: v.appWiring.name,
          scope: v.name,
          description: v.appWiring.description ?? `${v.appWiring.name} app wiring.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, v.appWiring.name) },
          ards: [],
          checks: ["rta check --app-wiring"],
          tests: [],
          inheritsFrom: [contextId, "pattern.app-wiring"],
          usedBy: [],
          metadata: v.appWiring,
        }))
      }
    }

    if (v.kind === "Connections") {
      const contextId = `context.${v.context}`
      for (const reaction of v.reactions ?? []) {
        nodes.push(makeNode({
          id: `${contextId}.reaction.${reaction.name}`,
          kind: "reaction",
          name: reaction.name,
          scope: v.context,
          description: reaction.description ?? `${reaction.name} reaction.`,
          path: rel,
          source: { path: rel, startLine: await findFirstLine(absolutePath, reaction.name) },
          ards: [],
          checks: ["rta check --operation-event"],
          tests: [],
          inheritsFrom: [contextId, ...(reaction.pattern ? [`pattern.${reaction.pattern}`] : [])],
          usedBy: [],
          metadata: {
            pattern: reaction.pattern ?? null,
            implementation: reaction.implementation ?? null,
            trigger: reaction.trigger,
            emits: reaction.emits,
          },
        }))
      }
    }
  }

  return nodes
}

const collectArdNodes = async (root: string): Promise<CatalogNode[]> => {
  const ardFiles = await discoverFiles(root, (rel) =>
    !isSemanticCatalogFixture(rel) &&
    (rel.endsWith(".ard.json") || rel.endsWith(".ard.yaml") || rel.endsWith(".ard.yml")),
  )
  const nodes: CatalogNode[] = []
  for (const absolutePath of ardFiles) {
    const rel = relative(root, absolutePath)
    const rawText = await readFile(absolutePath, "utf8").catch(() => "")
    let raw: ArdDoc | null = null
    try {
      raw = rel.endsWith(".json")
        ? JSON.parse(rawText) as ArdDoc
        : parseYaml(rawText) as ArdDoc
    } catch {
      raw = null
    }
    if (!raw?.id) continue
    nodes.push(makeNode({
      id: raw.id,
      kind: "ard",
      name: raw.name ?? raw.id,
      tier: raw.id.includes("-T2-") ? "t2" : raw.id.includes("-T1-") ? "t1" : undefined,
      description: raw.description ?? raw.decision ?? `${raw.id} architecture decision record.`,
      path: rel,
      source: { path: rel, startLine: await findFirstLine(absolutePath, raw.id) },
      ards: raw.letters ?? [],
      checks: [
        ...(raw.checks ?? []).flatMap((check) => check.command ? [check.command] : []),
        ...(raw.enforcement ?? []).flatMap((check) => check.command ? [check.command] : []),
      ],
      tests: [],
      inheritsFrom: normalizeStringList(raw.spirit),
      usedBy: raw.letters ?? [],
      metadata: {
        status: raw.status ?? null,
        severity: raw.severity ?? null,
        decision: raw.decision ?? null,
      },
    }))
  }
  return nodes
}

const collectSourceNodes = async (root: string): Promise<CatalogNode[]> => {
  const sourceFiles = await discoverFiles(root, (rel) =>
    SOURCE_EXTENSIONS.has(extname(rel)) &&
    !rel.startsWith("generated/") &&
    !rel.includes("/generated/") &&
    !rel.includes("/generated-tests/"),
  )
  return sourceFiles.map((absolutePath) => {
    const rel = relative(root, absolutePath)
    return makeNode({
      id: `source.${rel}`,
      kind: "source-file",
      name: rel.split("/").at(-1) ?? rel,
      description: `Repository source file: ${rel}.`,
      path: rel,
      source: { path: rel },
      ards: [],
      checks: [],
      tests: rel.includes("/test/") || rel.endsWith(".test.ts") ? [rel] : [],
      inheritsFrom: [],
      usedBy: [],
      metadata: { language: languageForPath(rel) },
    })
  })
}

const attachUsedBy = (nodes: CatalogNode[]): CatalogNode[] => {
  const usedBy = new Map<string, string[]>()
  for (const node of nodes) {
    for (const parent of node.inheritsFrom) {
      const current = usedBy.get(parent) ?? []
      current.push(node.id)
      usedBy.set(parent, current)
    }
  }
  return nodes.map((node) => ({
    ...node,
    usedBy: [...new Set([...(usedBy.get(node.id) ?? []), ...node.usedBy])].sort(),
  }))
}

const buildEdges = (nodes: CatalogNode[]): Catalog["edges"] =>
  nodes.flatMap((node) =>
    node.inheritsFrom.map((target) => ({
      from: node.id,
      to: target,
      kind: "inherits-from",
    })),
  )

export const buildCatalog = async (rootInput: string): Promise<Catalog> => {
  const root = resolve(rootInput)
  const nodes = attachUsedBy([
    ...conceptNodes.map((node) => makeNode(node)),
    ...vocabReferenceNodes.map((node) => makeNode(node)),
    ...(await collectVocabNodes(root)),
    ...(await collectArdNodes(root)),
    ...(await collectSourceNodes(root)),
  ]).sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
  return {
    root,
    generatedAt: new Date().toISOString(),
    nodes,
    edges: buildEdges(nodes),
  }
}

export const readCatalogSource = async (
  rootInput: string,
  requestedPath: string,
  range?: { start?: number; end?: number },
): Promise<CatalogSource> => {
  const root = resolve(rootInput)
  const rel = safeRelativePath(root, requestedPath)
  const absolutePath = resolve(root, rel)
  if (!existsSync(absolutePath)) throw new Error(`Source file not found: ${rel}`)
  const text = await readFile(absolutePath, "utf8")
  const allLines = text.split(/\r?\n/)
  const start = Math.max(1, range?.start ?? 1)
  const end = Math.min(allLines.length, range?.end ?? allLines.length)
  const lines = allLines.slice(start - 1, end).map((line, idx) => ({
    number: start + idx,
    text: line,
  }))
  return {
    path: rel,
    language: languageForPath(rel),
    text: lines.map((line) => line.text).join("\n"),
    lines,
  }
}

const termAliases = (node: CatalogNode): string[] => {
  const aliases = [node.name, node.id]
  if (node.kind === "pattern" && node.id.startsWith("pattern.")) {
    aliases.push(node.id.slice("pattern.".length))
  }
  if (node.kind === "ard") aliases.push(node.id)
  if (node.kind === "concept") aliases.push(String(node.metadata.term ?? node.name))
  if (node.kind === "vocab-symbol") aliases.push(String(node.metadata.term ?? node.name))
  return [...new Set(aliases.filter((alias) => alias.length >= 3))]
}

const isIdentifierChar = (value: string | undefined): boolean =>
  value !== undefined && /[A-Za-z0-9_.:-]/.test(value)

export const sourceLinksForText = (
  source: CatalogSource,
  nodes: ReadonlyArray<CatalogNode>,
): CatalogSourceLink[] => {
  const aliases = nodes.flatMap((node) =>
    termAliases(node).map((alias) => ({ alias, targetId: node.id })),
  ).sort((a, b) => b.alias.length - a.alias.length)
  const links: CatalogSourceLink[] = []

  for (const line of source.lines) {
    const claimed: Array<[number, number]> = []
    for (const { alias, targetId } of aliases) {
      let index = line.text.indexOf(alias)
      while (index >= 0) {
        const start = index
        const end = index + alias.length
        const overlaps = claimed.some(([a, b]) => start < b && end > a)
        const hasWordBoundary =
          !isIdentifierChar(line.text[start - 1]) &&
          !isIdentifierChar(line.text[end])
        if (!overlaps && hasWordBoundary) {
          claimed.push([start, end])
          links.push({
            line: line.number,
            startColumn: start + 1,
            endColumn: end + 1,
            text: alias,
            targetKind: "catalog-node",
            targetId,
          })
        }
        index = line.text.indexOf(alias, index + alias.length)
      }
    }
  }

  return links.sort((a, b) => a.line - b.line || a.startColumn - b.startColumn)
}

export const sourceLinksForPath = async (
  root: string,
  requestedPath: string,
): Promise<{ readonly path: string; readonly links: CatalogSourceLink[] }> => {
  const catalog = await buildCatalog(root)
  const source = await readCatalogSource(root, requestedPath)
  return {
    path: source.path,
    links: sourceLinksForText(source, catalog.nodes),
  }
}

const writeStdout = (text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    process.stdout.write(text, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

export const runCatalog = (opts: {
  readonly root?: string
  readonly json?: boolean
  readonly source?: string
  readonly sourceLinks?: string
} = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(opts.root ?? process.cwd())
    try {
      if (opts.source) {
        const source = yield* Effect.promise(() => readCatalogSource(root, opts.source!))
        yield* Effect.promise(() => writeStdout(`${JSON.stringify(source, null, 2)}\n`))
        return 0
      }
      if (opts.sourceLinks) {
        const links = yield* Effect.promise(() => sourceLinksForPath(root, opts.sourceLinks!))
        yield* Effect.promise(() => writeStdout(`${JSON.stringify(links, null, 2)}\n`))
        return 0
      }

      const catalog = yield* Effect.promise(() => buildCatalog(root))
      if (opts.json) {
        yield* Effect.promise(() => writeStdout(`${JSON.stringify(catalog, null, 2)}\n`))
      } else {
        console.log(`RTA catalog (${catalog.nodes.length} nodes)`)
        for (const node of catalog.nodes.filter((n) => n.kind !== "source-file")) {
          console.log(`${node.id.padEnd(56)} ${node.path}`)
        }
      }
      return 0
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      return 1
    }
  })
