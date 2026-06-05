import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { digestTranscriptV1 } from "../examples/meeting-digest-seed/meeting-digest-v1.mjs";
import { digestTranscriptV2, formatDigestMarkdown } from "../examples/meeting-digest-seed/meeting-digest-v2.mjs";
import { digestTranscriptIntegrated } from "../examples/meeting-digest-seed/meeting-digest-integrated.mjs";
import { checkApp, checkLogCeremony } from "../packages/checks/index.mjs";

const transcript = readFileSync(new URL("../examples/meeting-digest-seed/transcript.txt", import.meta.url), "utf8");

test("meeting digest v1 extracts topics and tasks", () => {
  const digest = digestTranscriptV1(transcript);
  assert.equal(digest.version, "v1");
  assert.ok(digest.topics.length >= 4);
  assert.ok(digest.tasks.length >= 4);
});

test("meeting digest v2 merges loopback topics and preserves touchstones", () => {
  const digest = digestTranscriptV2(`${transcript}\nVirgil: Back to logs, Grafana should show this later.`);
  assert.equal(digest.version, "v2");
  assert.ok(digest.topics.length >= 4);
  assert.ok(digest.tasks.some((task) => task.systems.includes("Grafana")));
  assert.ok(digest.provenance.taskCount === digest.tasks.length);
});

test("meeting digest app declaration is contract-valid", () => {
  const root = new URL("..", import.meta.url).pathname;
  assert.deepEqual(checkApp({ root, appDir: "examples/meeting-digest-seed" }), []);
  assert.deepEqual(checkLogCeremony({ root, appDir: "examples/meeting-digest-seed" }), []);
  assert.ok(existsSync(new URL("../examples/meeting-digest-seed/rta.app.json", import.meta.url)));
});

test("log ceremony check fails when declared vocabulary lacks operation ceremonies", () => {
  const root = join(tmpdir(), `rta-log-ceremony-${Date.now()}`);
  const appDir = join(root, "app");
  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, "rta.app.json"), JSON.stringify({
    name: "bad-logs",
    vocabulary: [{ id: "TranscriptInput", extends: "T1.Input", description: "input" }],
    useCases: [],
    scenarios: [],
    boundaries: [],
    logging: {
      humanReadableTemplate: "[{runId}] {step} actor={actor} input={input} output={output}",
      ceremonies: [],
    },
    publication: { requiresReview: true, adapters: ["dry-run-fixture"] },
    security: { inputPathPolicy: "repo-contained", redactSecrets: true, externalWritesRequireReview: true },
  }, null, 2));
  assert.match(checkLogCeremony({ root, appDir: "app" }).join("\n"), /logging\.ceremonies/);
});

test("meeting digest v2 produces human-readable markdown", () => {
  const digest = digestTranscriptV2(transcript);
  const markdown = formatDigestMarkdown(digest);
  assert.match(markdown, /## Topics/);
  assert.match(markdown, /## Extracted Work/);
  assert.match(markdown, /AFFiNE/);
});

test("meeting digest v2 recognizes monitoring and provenance work", () => {
  const digest = digestTranscriptV2("Virgil: Build a dashboard that shows RTA run provenance and talks to Grafana.");
  assert.equal(digest.topics[0].title, "Monitoring and provenance UI");
  assert.equal(digest.tasks[0].user, "operator monitoring runs");
  assert.ok(digest.tasks[0].talksTo.includes("Grafana dashboard adapter"));
});

test("integrated meeting digest rebuild adds RTA obligations without losing v2 tasks", () => {
  const v2 = digestTranscriptV2(transcript);
  const integrated = digestTranscriptIntegrated(transcript);
  assert.equal(integrated.version, "integrated-v3");
  assert.equal(integrated.tasks.length, v2.tasks.length);
  assert.ok(integrated.rta.obligations.includes("ReviewBeforePublication"));
  assert.ok(integrated.tasks.every((task) => task.rtaObligations.length > 0));
  assert.ok(integrated.provenance.derivationNodes > 0);
});
