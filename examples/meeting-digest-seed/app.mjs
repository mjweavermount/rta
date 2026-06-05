import { readFileSync } from "node:fs";
import { digestTranscriptV1 } from "./meeting-digest-v1.mjs";
import { assembleDigestV2, extractWorkItems, formatDigestMarkdown, parseTranscript, segmentTopics } from "./meeting-digest-v2.mjs";
import { integrateDigest, workItemSpecsFromDigest } from "./meeting-digest-integrated.mjs";

function readTranscript(input) {
  if (input?.transcriptText) return input.transcriptText;
  if (input?.transcriptPath) return readFileSync(input.transcriptPath, "utf8");
  return readFileSync(new URL("./transcript.txt", import.meta.url), "utf8");
}

export const scenarios = [
  {
    name: "meeting-digest.v1.fixture",
    async run({ runtime, logger, input }) {
      const transcript = readTranscript(input);
      logger.step({ runId: runtime.runId, step: "meetingDigest.v1.ingest", input: input?.transcriptPath ?? "transcript.txt", output: `${transcript.length} chars` });
      const digest = digestTranscriptV1(transcript);
      logger.step({ runId: runtime.runId, step: "meetingDigest.v1.digest", input: digest.topics.length, output: `${digest.tasks.length} tasks` });
      const artifactPath = runtime.saveArtifact("meeting-digest-v1.json", digest);
      return { artifactPath, ...digest };
    },
  },
  {
    name: "meeting-digest.v2.fixture",
    async run({ runtime, logger, input }) {
      const transcript = await readTranscriptOperation({ runtime, logger, input });
      const utterances = await runtime.operation({
        logger,
        name: "TranscriptInput.parse",
        input: `${transcript.length} chars`,
        run: () => parseTranscript(transcript),
      });
      const topics = await runtime.operation({
        logger,
        name: "TopicSegmenter.segment",
        input: `${utterances.length} utterances`,
        run: () => segmentTopics(utterances),
      });
      const tasks = await runtime.operation({
        logger,
        name: "WorkItemExtractor.extract",
        input: `${topics.length} topics`,
        run: () => extractWorkItems(topics),
      });
      const digest = await runtime.operation({
        logger,
        name: "ReviewableDigestJob.materialize",
        input: { utterances: utterances.length, topics: topics.length, tasks: tasks.length },
        run: () => assembleDigestV2({ utterances, topics, tasks }),
      });
      const artifactPath = await runtime.operation({
        logger,
        name: "DigestArtifact.write",
        input: { format: "json", name: "meeting-digest-v2.json" },
        run: () => runtime.saveArtifact("meeting-digest-v2.json", digest),
      });
      const markdownPath = await runtime.operation({
        logger,
        name: "DigestArtifact.write",
        input: { format: "markdown", name: "meeting-digest-v2.md" },
        run: () => runtime.saveArtifact("meeting-digest-v2.md", formatDigestMarkdown(digest)),
      });
      return { artifactPath, markdownPath, ...digest };
    },
  },
  {
    name: "meeting-digest.integrated.fixture",
    async run({ runtime, logger, input }) {
      return runIntegratedDigest({ runtime, logger, input, artifactBase: "meeting-digest-integrated" });
    },
  },
  {
    name: "meeting-digest.streaming.fixture",
    async run({ runtime, logger }) {
      const transcript = [
        "Virgil: We need the meeting digest app to notice topic shifts while I talk.",
        "Virgil: Then when we loop back to Grafana and provenance it should append instead of duplicating.",
        "Virgil: Also build the review gate before any Plane or AFFiNE publication adapter writes.",
      ].join("\n");
      return runIntegratedDigest({ runtime, logger, input: { transcriptText: transcript }, artifactBase: "meeting-digest-streaming", mode: "simulated-stream" });
    },
  },
  {
    name: "meeting-digest.loopback.fixture",
    async run({ runtime, logger }) {
      const transcript = [
        "Virgil: Grafana should show RTA run provenance.",
        "Virgil: The meeting digest should extract feature and automation tasks.",
        "Virgil: Back to Grafana, I want the same topic to collect this later detail.",
      ].join("\n");
      return runIntegratedDigest({ runtime, logger, input: { transcriptText: transcript }, artifactBase: "meeting-digest-loopback", mode: "loopback" });
    },
  },
  {
    name: "meeting-digest.enrichment-unavailable.fixture",
    async run({ runtime, logger }) {
      const transcript = [
        "Virgil: Enrich this against AFFiNE docs if they are available.",
        "Virgil: If not, respect limits and write the digest without pretending.",
      ].join("\n");
      return runIntegratedDigest({
        runtime,
        logger,
        input: { transcriptText: transcript, enrichmentAvailable: false },
        artifactBase: "meeting-digest-enrichment-unavailable",
        mode: "bulk-with-unavailable-enrichment",
      });
    },
  },
  {
    name: "approved-digest-publishes-work-items",
    async run({ runtime, logger, input }) {
      const result = await runIntegratedDigest({
        runtime,
        logger,
        input,
        artifactBase: "approved-digest-publishes-work-items",
        mode: "reviewable-work-items",
      });
      const workItemsPath = await runtime.operation({
        logger,
        name: "DigestArtifact.write",
        input: { format: "json", name: "approved-digest-work-items.json" },
        run: () => runtime.saveArtifact("approved-digest-work-items.json", workItemSpecsFromDigest(result)),
      });
      return { ...result, workItemsPath };
    },
  },
];

function readTranscriptOperation({ runtime, logger, input }) {
  return runtime.operation({
    logger,
    name: "TranscriptInput.read",
    input: input?.transcriptPath ?? (input?.transcriptText ? "inline transcript" : "transcript.txt"),
    run: () => readTranscript(input),
  });
}

async function runIntegratedDigest({ runtime, logger, input = {}, artifactBase, mode = "bulk" }) {
  const transcript = await readTranscriptOperation({ runtime, logger, input });
  const utterances = await runtime.operation({
    logger,
    name: "TranscriptInput.parse",
    input: `${transcript.length} chars`,
    detail: { mode },
    run: () => parseTranscript(transcript),
  });
  const topics = await runtime.operation({
    logger,
    name: "TopicSegmenter.segment",
    input: `${utterances.length} utterances`,
    detail: { mode, appendLoopbacks: true },
    run: () => segmentTopics(utterances),
  });
  const tasks = await runtime.operation({
    logger,
    name: "WorkItemExtractor.extract",
    input: `${topics.length} topics`,
    detail: { schema: ["goal", "user", "systems", "talksTo", "largerSystem", "classification"] },
    run: () => extractWorkItems(topics),
  });
  const digest = await runtime.operation({
    logger,
    name: "ReviewableDigestJob.materialize",
    input: { utterances: utterances.length, topics: topics.length, tasks: tasks.length, mode },
    detail: { enrichmentAvailable: input.enrichmentAvailable !== false },
    run: () => integrateDigest(assembleDigestV2({
      utterances,
      topics,
      tasks,
      strategy: `RTA integrated declaration + derivation + ${mode} digest engine`,
    }), { enrichmentAvailable: input.enrichmentAvailable !== false, mode }),
  });
  const artifactPath = await runtime.operation({
    logger,
    name: "DigestArtifact.write",
    input: { format: "json", name: `${artifactBase}.json` },
    run: () => runtime.saveArtifact(`${artifactBase}.json`, digest),
  });
  const markdownPath = await runtime.operation({
    logger,
    name: "DigestArtifact.write",
    input: { format: "markdown", name: `${artifactBase}.md` },
    run: () => runtime.saveArtifact(`${artifactBase}.md`, formatDigestMarkdown(digest)),
  });
  return { artifactPath, markdownPath, ...digest };
}
