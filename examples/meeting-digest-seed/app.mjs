import { readFileSync } from "node:fs";
import { digestTranscriptV1 } from "./meeting-digest-v1.mjs";
import { digestTranscriptV2, formatDigestMarkdown } from "./meeting-digest-v2.mjs";

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
      const transcript = readTranscript(input);
      logger.step({ runId: runtime.runId, step: "meetingDigest.v2.ingest", input: input?.transcriptPath ?? "transcript.txt", output: `${transcript.length} chars` });
      const digest = digestTranscriptV2(transcript);
      logger.step({
        runId: runtime.runId,
        step: "meetingDigest.v2.digest",
        input: `${digest.provenance.utteranceCount} utterances`,
        output: `${digest.topics.length} topics, ${digest.tasks.length} tasks`,
        detail: digest.provenance,
      });
      const artifactPath = runtime.saveArtifact("meeting-digest-v2.json", digest);
      const markdownPath = runtime.saveArtifact("meeting-digest-v2.md", formatDigestMarkdown(digest));
      return { artifactPath, markdownPath, ...digest };
    },
  },
];
