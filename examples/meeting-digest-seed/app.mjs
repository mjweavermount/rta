import { readFileSync } from "node:fs";
import { digestTranscriptV1 } from "./meeting-digest-v1.mjs";
import { digestTranscriptV2 } from "./meeting-digest-v2.mjs";

export const scenarios = [
  {
    name: "meeting-digest.v1.fixture",
    async run({ runtime, logger }) {
      const transcript = readFileSync(new URL("./transcript.txt", import.meta.url), "utf8");
      logger.step({ runId: runtime.runId, step: "meetingDigest.v1.ingest", input: "transcript.txt", output: `${transcript.length} chars` });
      const digest = digestTranscriptV1(transcript);
      logger.step({ runId: runtime.runId, step: "meetingDigest.v1.digest", input: digest.topics.length, output: `${digest.tasks.length} tasks` });
      const artifactPath = runtime.saveArtifact("meeting-digest-v1.json", digest);
      return { artifactPath, ...digest };
    },
  },
  {
    name: "meeting-digest.v2.fixture",
    async run({ runtime, logger }) {
      const transcript = readFileSync(new URL("./transcript.txt", import.meta.url), "utf8");
      logger.step({ runId: runtime.runId, step: "meetingDigest.v2.ingest", input: "transcript.txt", output: `${transcript.length} chars` });
      const digest = digestTranscriptV2(transcript);
      logger.step({
        runId: runtime.runId,
        step: "meetingDigest.v2.digest",
        input: `${digest.provenance.utteranceCount} utterances`,
        output: `${digest.topics.length} topics, ${digest.tasks.length} tasks`,
        detail: digest.provenance,
      });
      const artifactPath = runtime.saveArtifact("meeting-digest-v2.json", digest);
      return { artifactPath, ...digest };
    },
  },
];
