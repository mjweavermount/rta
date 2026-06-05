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
  FileBackedRepository,
  FileReadBoundary,
  FileQueue,
  FileRuntime,
  InMemoryRepository,
  InMemorySecretStore,
  ReviewQueue,
  RunQueuedScenarioJob,
  SchemaEdgeBoundary,
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
      const runtime = new FileRuntime({ root, runId, clock })
      const artifactPath = runtime.saveArtifact("digest.json", { ok: true })
      runtime.recordStep({ step: "digest.created", actor: "codex" })

      const state = runtime.loadState()
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
        run: async () => ({ runId: "run-1" }),
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
      logs.stop()

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
    expect(loaded.key).toBe("otter.api_key")
    expect(revealed).toBe("cleartext-value")
    expect(logs.entries.map((entry) => entry.line).join("\n")).not.toContain("cleartext-value")
    expect(logs.entries.some((entry) =>
      entry.event.primitiveType === "secret" &&
      entry.line.includes("Reveal secret otter.api_key"),
    )).toBe(true)
  })
})
