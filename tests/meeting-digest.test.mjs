import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { digestTranscriptV1 } from "../examples/meeting-digest-seed/meeting-digest-v1.mjs";
import { digestTranscriptV2, formatDigestMarkdown } from "../examples/meeting-digest-seed/meeting-digest-v2.mjs";
import { checkApp } from "../packages/checks/index.mjs";

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
  assert.ok(existsSync(new URL("../examples/meeting-digest-seed/rta.app.json", import.meta.url)));
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
