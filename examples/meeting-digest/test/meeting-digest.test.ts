import { describe, expect, it } from "vitest"
import { createMeetingDigest, runMeetingDigestScenario } from "../src/index.js"

const transcript = `
Topic: RTA reset
Build a TypeScript RTA repo that supersedes the old Rita and mjs attempts.
Research which pieces should come from rta-ddd-core and rita-app-framework.

Topic: Meeting digest proving app
Automate extraction of feature, automation, and research tasks from Otter transcripts into AFFiNE and Plane after review.
Generate human-readable logs and provenance for each digest run.
`

describe("meeting digest proving fixture", () => {
  it("extracts topics and typed work items with systems and users", () => {
    const digest = createMeetingDigest("meeting-1", transcript)

    expect(digest.topics.map((topic) => topic.title)).toEqual([
      "RTA reset",
      "Meeting digest proving app",
    ])
    expect(digest.workItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "research",
        systems: expect.arrayContaining(["RTA"]),
        users: expect.arrayContaining(["Virgil"]),
      }),
      expect.objectContaining({
        kind: "automation",
        systems: expect.arrayContaining(["AFFiNE", "Plane", "Otter"]),
        largerSystem: "RTA-authored workflow app",
      }),
    ]))
    expect(digest.review.status).toBe("needs-review")
    expect(digest.publication.mode).toBe("dry-run")
  })

  it("runs through the instrumented command handler and emits readable logs", async () => {
    const result = await runMeetingDigestScenario(transcript)

    expect(result.digest.workItems.length).toBeGreaterThanOrEqual(3)
    expect(result.logLines).toEqual([
      "[normal] DIGEST_MEETING_HANDLER Received command Digest meeting-1 because the transcript is ready for topic and work-item extraction with topics, work items, and human review",
      "[normal] DIGEST_MEETING_HANDLER Started command Digest meeting-1 because the transcript is ready for topic and work-item extraction with topics, work items, and human review",
      "[normal] DRY_RUN_PUBLICATION_ADAPTER Received outbound adapter Stage dry-run publication meeting-1 because external writes require human review before commit with AFFiNE, Plane, and GitHub",
      "[normal] DRY_RUN_PUBLICATION_ADAPTER Started outbound adapter Stage dry-run publication meeting-1 because external writes require human review before commit with AFFiNE, Plane, and GitHub",
      "[normal] DRY_RUN_PUBLICATION_ADAPTER Completed outbound adapter Stage dry-run publication meeting-1 because external writes require human review before commit with AFFiNE, Plane, and GitHub",
      "[normal] DIGEST_MEETING_HANDLER Completed command Digest meeting-1 because the transcript is ready for topic and work-item extraction with topics, work items, and human review",
    ])
  })

  it("can run with trace verbosity for operator debugging", async () => {
    const result = await runMeetingDigestScenario(transcript, { verbosity: "trace" })

    expect(result.logLines).toEqual(expect.arrayContaining([
      expect.stringContaining("[trace] DRY_RUN_PUBLICATION_ADAPTER Started outbound adapter Stage dry-run publication meeting-1"),
    ]))
    const adapterStarted = result.logLines.find((line) => line.includes("DRY_RUN_PUBLICATION_ADAPTER Started"))
    expect(adapterStarted).toBeDefined()
    expect(adapterStarted).toContain("input=2 topics and")
    expect(adapterStarted).toContain("correlationId=meeting-digest-id-1")
    expect(adapterStarted).toContain("causationId=meeting-digest-id-1")
    expect(adapterStarted).toContain("messageId=meeting-digest-id-2")
    expect(adapterStarted).toContain("lineage=fixture:meeting-digest,primitive:outbound-adapter,policy:review-before-external-write")
    expect(adapterStarted).toContain("system=AFFiNE/Plane/GitHub")
    expect(adapterStarted).toContain("mode=dry-run")
    expect(adapterStarted).toContain("reviewRequired=true")
  })
})
