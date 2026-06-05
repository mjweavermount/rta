import { readFileSync } from "node:fs";
import { digestTranscriptV1 } from "./meeting-digest-v1.mjs";
import { assembleDigestV2, extractWorkItems, formatDigestMarkdown, parseTranscript, segmentTopics } from "./meeting-digest-v2.mjs";
import { integrateDigest } from "./meeting-digest-integrated.mjs";

function readTranscript(input) {
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
        run: () => integrateDigest(assembleDigestV2({
          utterances,
          topics,
          tasks,
          strategy: "RTA integrated declaration + derivation + v2 digest engine",
        })),
      });
      const artifactPath = await runtime.operation({
        logger,
        name: "DigestArtifact.write",
        input: { format: "json", name: "meeting-digest-integrated.json" },
        run: () => runtime.saveArtifact("meeting-digest-integrated.json", digest),
      });
      const markdownPath = await runtime.operation({
        logger,
        name: "DigestArtifact.write",
        input: { format: "markdown", name: "meeting-digest-integrated.md" },
        run: () => runtime.saveArtifact("meeting-digest-integrated.md", formatDigestMarkdown(digest)),
      });
      return { artifactPath, markdownPath, ...digest };
    },
  },
];

function readTranscriptOperation({ runtime, logger, input }) {
  return runtime.operation({
    logger,
    name: "TranscriptInput.read",
    input: input?.transcriptPath ?? "transcript.txt",
    run: () => readTranscript(input),
  });
}
