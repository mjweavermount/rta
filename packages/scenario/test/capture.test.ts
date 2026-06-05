import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CaptureBuilder, writeScenarioArtifacts } from "../src/index.js"

describe("scenario capture artifacts", () => {
  it("asserts that expected primitives spoke", () => {
    const capture = new CaptureBuilder()
    capture.execution({
      primitiveType: "outbound-adapter",
      primitiveName: "DryRunPublicationAdapter",
      phase: "started",
      context: "MeetingDigest",
      correlationId: "corr-1",
      causationId: "cause-1",
      messageId: "msg-1",
      summary: {
        action: "Stage publication",
        reason: "review approved",
      },
    }, "[normal] DRY_RUN_PUBLICATION_ADAPTER Started outbound adapter Stage publication because review approved")

    expect(() => capture.expectPrimitiveSpoke("DryRunPublicationAdapter", ["started"])).not.toThrow()
    expect(() => capture.expectPrimitiveSpoke("DryRunPublicationAdapter", ["completed"])).toThrow(/completed/)
  })

  it("writes readable logs, operation events, and trace summaries", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "rta-scenario-artifacts-"))
    try {
      await writeScenarioArtifacts({
        suite: "Meeting Digest",
        name: "dry-run publication",
        slug: "meeting-digest/dry-run-publication",
        passed: true,
        failures: [],
        durationMs: 12,
        capturedAt: new Date(0).toISOString(),
        timeline: [{
          kind: "execution",
          primitiveType: "outbound-adapter",
          primitiveName: "DryRunPublicationAdapter",
          phase: "completed",
          context: "MeetingDigest",
          line: "[normal] DRY_RUN_PUBLICATION_ADAPTER Completed outbound adapter Stage publication because review approved",
          t: 1,
        }],
      }, tempRoot)

      const readable = await readFile(
        join(tempRoot, "meeting-digest", "dry-run-publication.readable.log"),
        "utf8",
      )
      const events = await readFile(
        join(tempRoot, "meeting-digest", "dry-run-publication.operation-events.json"),
        "utf8",
      )
      const summary = await readFile(
        join(tempRoot, "meeting-digest", "dry-run-publication.trace-summary.md"),
        "utf8",
      )

      expect(readable).toContain("DRY_RUN_PUBLICATION_ADAPTER Completed")
      expect(events).toContain("\"primitiveName\": \"DryRunPublicationAdapter\"")
      expect(summary).toContain("## Primitive Trace")
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  })
})
