import { Effect } from "effect"
import { Schema } from "effect"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import {
  ContextFactory,
  RepositoryError,
  SimulatedClock,
  SimulatedRandom,
  makeAggregateRoot,
  type AggregateRoot,
  type RepositoryCodec,
} from "@rta/core"
import { createReadableLogBuffer } from "@rta/strict"
import {
  CreateReviewItem,
  EnqueueScenarioJob,
  EnvironmentSecretStore,
  ApiTokenSecretStore,
  FileBackedRepository,
  FileReadBoundary,
  FileQueue,
  FileRuntime,
  FileSecretStore,
  InMemoryRepository,
  InMemorySecretStore,
  ReviewQueue,
  RunQueuedScenarioJob,
  SchemaEdgeBoundary,
  SecretRedactor,
  SqlBoundary,
  createRunId,
} from "../src/index.js"

const run = <A, E>(effect: Effect.Effect<A, E, never>) => Effect.runPromise(effect)

type CounterId = string & { readonly _tag: "CounterId" }
type Counter = AggregateRoot<CounterId, { readonly count: number }>

const makeCounter = (id: string, count: number): Counter =>
  makeAggregateRoot(id as CounterId, { count })

const counterCodec: RepositoryCodec<Counter> = {
  entityType: "Counter",
  encode: (aggregate) => ({
    id: aggregate.id,
    data: aggregate.data,
  }),
  decode: (stored) => {
    if (
      typeof stored === "object" &&
      stored !== null &&
      "id" in stored &&
      "data" in stored &&
      typeof stored.id === "string" &&
      typeof stored.data === "object" &&
      stored.data !== null &&
      "count" in stored.data &&
      typeof stored.data.count === "number"
    ) {
      return Effect.succeed(makeCounter(stored.id, stored.data.count))
    }
    return Effect.fail(new RepositoryError({
      message: "invalid counter payload",
      cause: stored,
    }))
  },
}

describe("@rta/runtime", () => {
  it("records file runtime state, artifacts, and provenance", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-test-"))
    try {
      const clock = new SimulatedClock(new Date("2026-01-02T03:04:05.000Z"))
      const runId = createRunId("run", clock)
      const runtime = await run(FileRuntime.create({ root, runId, clock }))
      const artifactPath = await run(runtime.saveArtifact("digest.json", { ok: true }))
      await run(runtime.recordStep({ step: "digest.created", actor: "codex" }))

      const state = await run(runtime.loadState())
      expect(state.runId).toBe("run-2026-01-02T03-04-05-000Z")
      expect(state.artifacts[0]?.name).toBe("digest.json")
      expect(JSON.parse(await readFile(artifactPath, "utf8"))).toEqual({ ok: true })

      const provenance = JSON.parse(
        await readFile(join(runtime.runRoot, "artifacts", "provenance.json"), "utf8"),
      )
      expect(provenance.nodes.some((node: { type: string }) => node.type === "artifact")).toBe(true)
      expect(provenance.nodes.some((node: { step?: string }) => node.step === "digest.created")).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("runs queue and review operations through instrumented primitives", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-test-"))
    try {
      const clock = new SimulatedClock(new Date("2026-01-02T03:04:05.000Z"))
      const scope = new ContextFactory(
        clock,
        new SimulatedRandom(["trace-1", "span-1", "span-2", "span-3"]),
      )
        .createExternal({ actorId: "codex" })
        .promote("internal", { message: "runtime test" })

      const logs = createReadableLogBuffer({ verbosity: "trace" })
      const queue = new FileQueue({ root, clock })
      const job = await run(new EnqueueScenarioJob().invoke({
        queue,
        scenario: "meeting-digest.default",
        review: true,
        verbosity: "trace",
      }, scope))

      const completed = await run(new RunQueuedScenarioJob().invoke({
        queue,
        job,
        run: () => Effect.succeed({ runId: "run-1" }),
      }, scope))

      const reviews = new ReviewQueue({ root, clock })
      const review = await run(new CreateReviewItem().invoke({
        queue: reviews,
        runId: "run-1",
        title: "Review digest",
        artifactPath: "/tmp/digest.md",
        summary: "Digest ready",
      }, scope))
      logs.stop()

      expect(completed.status).toBe("completed")
      expect(completed.result).toEqual({ runId: "run-1" })
      expect(review.status).toBe("pending")
      expect(logs.entries.map((entry) => entry.event.primitiveType)).toEqual(
        expect.arrayContaining(["scheduler", "job", "policy"]),
      )
      expect(logs.entries.some((entry) => entry.line.includes("Enqueue meeting-digest.default"))).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("persists aggregates through in-memory and file-backed repositories with operation logs", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-repo-test-"))
    try {
      const logs = createReadableLogBuffer({ verbosity: "trace" })
      const memoryRepo = new InMemoryRepository<Counter>({
        entityType: "Counter",
        idPrefix: "counter",
      })
      const nextId = await run(memoryRepo.nextId())
      const counter = makeCounter(nextId, 1)
      await run(memoryRepo.save(counter))
      expect((await run(memoryRepo.findById(nextId))).data.count).toBe(1)

      const fileRepo = new FileBackedRepository<Counter>({
        root,
        entityType: "Counter",
        idFactory: () => "counter-file-1" as CounterId,
        codec: counterCodec,
      })
      const fileId = await run(fileRepo.nextId())
      await run(fileRepo.save(makeCounter(fileId, 7)))
      expect((await run(fileRepo.findById(fileId))).data.count).toBe(7)
      const stored = JSON.parse(
        await readFile(join(root, ".rta", "repositories", "Counter", `${fileId}.json`), "utf8"),
      )
      logs.stop()

      expect(stored).toEqual({
        schemaVersion: 1,
        payload: {
          id: fileId,
          data: { count: 7 },
        },
      })
      expect(logs.entries.some((entry) =>
        entry.event.primitiveType === "repository" &&
        entry.line.includes("Save Counter"),
      )).toBe(true)
      expect(logs.entries.some((entry) =>
        entry.event.primitiveType === "repository" &&
        entry.line.includes("Read Counter"),
      )).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("promotes external inputs through edge boundaries and rejects unsafe file reads", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-edge-test-"))
    try {
      await writeFile(join(root, "input.txt"), "hello", "utf8")
      const logs = createReadableLogBuffer({ verbosity: "verbose" })
      const Payload = Schema.Struct({ id: Schema.NonEmptyString })
      const boundary = new SchemaEdgeBoundary({
        name: "HttpPayloadBoundary",
        system: "http",
        schema: Payload,
      })
      const parsed = await run(boundary.parse(
        { id: "ok" },
        { message: "HTTP request body must be validated" },
      ))
      expect(parsed.id).toBe("ok")

      const fileBoundary = new FileReadBoundary({ root })
      expect(await run(fileBoundary.read("input.txt", { message: "read user supplied file path" }))).toBe("hello")
      const rejected = await Effect.runPromise(Effect.either(
        fileBoundary.read("../outside.txt", { message: "reject path traversal" }),
      ))
      logs.stop()

      expect(rejected._tag).toBe("Left")
      expect(logs.entries.some((entry) =>
        entry.event.primitiveType === "edge-boundary" &&
        entry.line.includes("Promote input through HttpPayloadBoundary"),
      )).toBe(true)
      expect(logs.entries.some((entry) =>
        entry.event.primitiveType === "edge-boundary" &&
        entry.line.includes("Read file input.txt"),
      )).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("prepares SQL through whitelisted identifiers and typed parameters", async () => {
    const logs = createReadableLogBuffer({ verbosity: "trace" })
    const boundary = new SqlBoundary({
      policy: {
        tables: ["invoice"],
        columns: {
          invoice: ["id", "status", "amountCents"],
        },
        sortDirections: ["asc"],
      },
    })
    const query = await run(boundary.parse({
      table: "invoice",
      columns: ["id", "status"],
      where: {
        status: "open",
        amountCents: 1200,
      },
      orderBy: { column: "id", direction: "asc" },
      limit: 50,
    }, { message: "SQL rows must be reached through a prepared statement plan" }))
    const rejected = await Effect.runPromise(Effect.either(boundary.parse({
      table: "invoice; drop table invoice",
      columns: ["id"],
    }, { message: "reject raw SQL fragments" })))
    logs.stop()

    expect(query.sql).toBe("SELECT \"id\", \"status\" FROM \"invoice\" WHERE \"status\" = ? AND \"amountCents\" = ? ORDER BY \"id\" ASC LIMIT 50")
    expect(query.params).toEqual(["open", 1200])
    expect(rejected._tag).toBe("Left")
    expect(logs.entries.some((entry) =>
      entry.event.primitiveType === "edge-boundary" &&
      entry.line.includes("Prepare SQL query for invoice"),
    )).toBe(true)
  })

  it("stores secrets as redacted refs and reveals only through a policy token", async () => {
    const logs = createReadableLogBuffer({ verbosity: "trace" })
    const scope = new ContextFactory(undefined, new SimulatedRandom(["trace", "span"]))
      .createExternal({ actorId: "codex" })
      .promote("internal", { message: "secret test" })
    const token = scope.authorize("secrets.reveal", { message: "test needs cleartext" })

    const store = new InMemorySecretStore()
    const ref = await run(store.put("otter.api_key", "cleartext-value"))
    const loaded = await run(store.get("otter.api_key"))
    const revealed = await run(store.reveal(loaded, token))
    logs.stop()

    expect(ref.redacted).toBe("[secret]")
    expect(String(ref)).toBe("[secret]")
    expect(JSON.stringify({ ref })).toBe("{\"ref\":\"[secret]\"}")
    expect(loaded.key).toBe("otter.api_key")
    expect(revealed).toBe("cleartext-value")
    expect(logs.entries.map((entry) => entry.line).join("\n")).not.toContain("cleartext-value")
    expect(logs.entries.some((entry) =>
      entry.event.primitiveType === "secret" &&
      entry.line.includes("Reveal secret otter.api_key"),
    )).toBe(true)
  })

  it("loads environment and file secrets as redacted refs", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-secret-source-test-"))
    try {
      const scope = new ContextFactory(undefined, new SimulatedRandom(["trace", "span"]))
        .createExternal({ actorId: "codex" })
        .promote("internal", { message: "secret source test" })
      const token = scope.authorize("secrets.reveal", { message: "test needs cleartext" })
      const logs = createReadableLogBuffer({ verbosity: "trace" })

      const envStore = new EnvironmentSecretStore({ env: { AFFINE_TOKEN: "env-secret" } })
      const envRef = await run(envStore.get("AFFINE_TOKEN"))
      const envSecret = await run(envStore.reveal(envRef, token))

      const secretPath = join(root, "plane-token.txt")
      await writeFile(secretPath, "cleartext-from-file\n", "utf8")
      const fileStore = new FileSecretStore({ files: { PLANE_TOKEN: secretPath } })
      const fileRef = await run(fileStore.get("PLANE_TOKEN"))
      const fileSecret = await run(fileStore.reveal(fileRef, token))
      logs.stop()

      expect(String(envRef)).toBe("[secret]")
      expect(String(fileRef)).toBe("[secret]")
      expect(envSecret).toBe("env-secret")
      expect(fileSecret).toBe("cleartext-from-file")
      expect(logs.entries.map((entry) => entry.line).join("\n")).not.toContain("env-secret")
      expect(logs.entries.map((entry) => entry.line).join("\n")).not.toContain("cleartext-from-file")
      expect(logs.entries.some((entry) => entry.line.includes("Reveal environment secret AFFINE_TOKEN"))).toBe(true)
      expect(logs.entries.some((entry) => entry.line.includes("Reveal file secret PLANE_TOKEN"))).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("namespaces API token secrets through a backing secret store", async () => {
    const scope = new ContextFactory(undefined, new SimulatedRandom(["trace", "span"]))
      .createExternal({ actorId: "codex" })
      .promote("internal", { message: "api token secret test" })
    const token = scope.authorize("secrets.reveal", { message: "test needs cleartext" })
    const backing = new InMemorySecretStore({ initial: { "api:affine": "affine-token" } })
    const apiTokens = new ApiTokenSecretStore({ delegate: backing })

    const ref = await run(apiTokens.get("affine"))
    const revealed = await run(apiTokens.reveal(ref, token))

    expect(ref.key).toBe("api:affine")
    expect(revealed).toBe("affine-token")
  })

  it("redacts secret refs and secret-shaped fields before writing artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-runtime-secret-artifact-test-"))
    try {
      const store = new InMemorySecretStore()
      const ref = await run(store.put("affine.token", "cleartext-token"))
      const runtime = await run(FileRuntime.create({ root, runId: "secret-run" }))
      const artifactPath = await run(runtime.saveArtifact("payload.json", {
        token: "raw-token-value",
        nested: {
          secretRef: ref,
          ordinary: "keep-me",
        },
      }))
      const artifact = await readFile(artifactPath, "utf8")

      expect(artifact).toContain("\"token\": \"[secret]\"")
      expect(artifact).toContain("\"secretRef\": \"[secret]\"")
      expect(artifact).toContain("keep-me")
      expect(artifact).not.toContain("cleartext-token")
      expect(artifact).not.toContain("raw-token-value")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("redacts recursively without mutating the original payload", () => {
    const ref = new SecretRedactor()
    const payload = {
      password: "pw",
      nested: {
        apiKey: "key",
        label: "safe",
      },
    }

    expect(ref.redact(payload)).toEqual({
      password: "[secret]",
      nested: {
        apiKey: "[secret]",
        label: "safe",
      },
    })
    expect(payload.nested.apiKey).toBe("key")
  })
})
