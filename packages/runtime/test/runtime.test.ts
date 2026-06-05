import { Effect } from "effect"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { ContextFactory, SimulatedClock, SimulatedRandom } from "@rta/core"
import { createReadableLogBuffer } from "@rta/strict"
import {
  CreateReviewItem,
  EnqueueScenarioJob,
  FileQueue,
  FileRuntime,
  ReviewQueue,
  RunQueuedScenarioJob,
  createRunId,
} from "../src/index.js"

const run = <A, E>(effect: Effect.Effect<A, E, never>) => Effect.runPromise(effect)

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
})
