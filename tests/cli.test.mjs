import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url);

function rta(args, options = {}) {
  return execFileSync("node", ["scripts/rta.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

test("cli lists work and explains meeting digest obligation", () => {
  const list = rta(["work", "list"]);
  assert.match(list, /meeting-digest-proving-app/);
  const explanation = rta(["explain", "obligation", "meeting-digest"]);
  assert.match(explanation, /ReviewGate/);
  assert.match(rta(["check", "--meeting-digest"]), /passed/);
  assert.match(rta(["check", "--ard-meta"]), /passed/);
  assert.match(rta(["check", "--tier-contracts"]), /passed/);
  assert.match(rta(["check", "--pattern-contracts"]), /passed/);
  assert.match(rta(["check", "--archetype-bindings"]), /passed/);
  assert.match(rta(["check", "--extensions-local"]), /passed/);
  assert.match(rta(["check", "--extensions-upstreamable"]), /passed/);
  assert.match(rta(["check", "--derived-obligations"]), /passed/);
  assert.match(rta(["check", "--use-cases"]), /passed/);
  assert.match(rta(["check", "--scenario-coverage"]), /passed/);
  assert.match(rta(["check", "--boundary-coverage"]), /passed/);
  assert.match(rta(["check", "--integration-contracts"]), /passed/);
  assert.match(rta(["check", "--telemetry-coverage"]), /passed/);
  assert.match(rta(["check", "--log-ceremony"]), /passed/);
  assert.match(rta(["check", "--security"]), /passed/);
  assert.match(rta(["check", "--all"]), /All implemented RTA checks passed/);
});

test("cli exposes the required production command surface honestly", () => {
  const doctor = JSON.parse(rta(["doctor"]));
  assert.equal(doctor.status, "pass-with-planned-work");
  assert.equal(doctor.checks.find((check) => check.name === "required command surface").status, "pass");
  assert.match(rta(["lint"]), /Lint passed/);
  assert.match(rta(["graph"]), /TranscriptInput/);
  assert.match(rta(["dev"]), /productionGate/);
  assert.match(rta(["test-scenario", "list"]), /meeting-digest.integrated.fixture/);
  assert.match(rta(["extensions", "list"]), /MeetingDigestTopicSegmenter/);
  assert.match(rta(["upstream", "plan", "MeetingDigestTopicSegmenter"]), /upstreamRequires/);
});

test("cli runs demo, review can approve, and dry-run publish is gated", () => {
  const demo = rta(["demo", "run"]);
  const reviewId = demo.match(/review=(\S+)/)?.[1];
  assert.ok(reviewId);

  assert.throws(() => rta(["publish", "dry-run", reviewId]), /publication requires approved review/);

  const approved = rta(["review", "approve", reviewId, "--actor", "test-operator"]);
  assert.match(approved, /approved/);
  const publication = rta(["publish", "dry-run", reviewId, "--target", "fixture"]);
  assert.match(publication, /"externalWrites": \[\]/);
});

test("generated-style meeting digest cli runs v2 through rta", () => {
  const out = execFileSync("node", ["examples/meeting-digest-seed/bin/meeting-digest.mjs", "--review"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.match(out, /TopicSegmenter.segment.complete/);
  assert.match(out, /WorkItemExtractor.extract.complete/);
  assert.match(out, /review=/);
});

test("scenario watch streams trace ceremony logs in the terminal", () => {
  const out = rta(["scenario", "watch", "meeting-digest.integrated.fixture", "--input", "tests/fixtures/custom-transcript.txt"]);
  assert.match(out, /#1 scenario\.meeting-digest\.integrated\.fixture\.start/);
  assert.match(out, /at=/);
  assert.match(out, /parent=/);
  assert.match(out, /event=/);
  assert.match(out, /TranscriptInput\.read\.complete/);
  assert.match(out, /TranscriptInput\.parse\.complete/);
  assert.match(out, /TopicSegmenter\.segment\.complete/);
  assert.match(out, /WorkItemExtractor\.extract\.complete/);
  assert.match(out, /ReviewableDigestJob\.materialize\.complete/);
  assert.match(out, /run=/);
});

test("generated-style meeting digest cli accepts custom transcript and emits markdown plus step provenance", () => {
  const out = execFileSync("node", [
    "examples/meeting-digest-seed/bin/meeting-digest.mjs",
    "--input",
    "tests/fixtures/custom-transcript.txt",
    "--high",
  ], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  const digestPath = out.match(/^digest=(.+)$/m)?.[1];
  const runId = out.match(/^run=(.+)$/m)?.[1];
  assert.ok(digestPath);
  assert.ok(runId);
  assert.ok(existsSync(digestPath));
  assert.match(readFileSync(digestPath, "utf8"), /Meeting Digest/);
  const provenancePath = new URL(`../.rta/runs/${runId}/artifacts/provenance.json`, import.meta.url);
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  assert.ok(provenance.nodes.some((node) => node.type === "step"));
});

test("hosting adapter renders intent without deploying", () => {
  const out = rta(["hosting", "render", "meeting-digest"]).trim();
  assert.match(out, /\.rta\/hosting\/meeting-digest\.workload-app\.yaml$/);
  assert.match(readFileSync(out, "utf8"), /apiVersion: lab.virgil.info\/v1alpha1/);
  assert.match(readFileSync(out, "utf8"), /contractLevel: full/);
});

test("rta generates an app cli that runs the integrated meeting digest", () => {
  const generated = rta(["generate", "app-cli"]).trim();
  assert.ok(existsSync(generated));
  const out = execFileSync("node", [generated, "--input", "tests/fixtures/custom-transcript.txt", "--high"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.match(out, /ReviewableDigestJob.materialize.complete/);
  assert.match(out, /215 chars/);
  assert.match(out, /meeting-digest-integrated.json/);
});

test("runtime records unit-of-work state and replays run provenance", () => {
  const now = "2026-01-02T03:04:05.000Z";
  const out = rta([
    "scenario",
    "run",
    "meeting-digest.integrated.fixture",
    "--input",
    "tests/fixtures/custom-transcript.txt",
    "--high",
  ], { env: { RTA_NOW: now } });
  const runId = out.match(/^run=(.+)$/m)?.[1];
  assert.equal(runId, "meeting-digest-integrated-fixture-2026-01-02T03-04-05-000Z");

  const statePath = new URL(`../.rta/runs/${runId}/state.json`, import.meta.url);
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  assert.ok(state.unitOfWorks.some((item) => item.name === "TopicSegmenter.segment" && item.status === "completed"));
  assert.ok(state.unitOfWorks.some((item) => item.name === "DigestArtifact.write" && item.status === "completed"));
  assert.equal(state.unitOfWorks[0].startedAt, now);

  const replay = JSON.parse(rta(["scenario", "replay", runId]));
  assert.equal(replay.runId, runId);
  assert.ok(replay.unitOfWorks.length >= 6);
  assert.ok(replay.logSteps.some((step) => step.step === "WorkItemExtractor.extract.complete"));
  assert.ok(replay.provenance.stepNodes >= replay.logSteps.length);
});

test("scheduler start once runs a queued scenario and stores its run result", () => {
  rmSync(new URL("../.rta/queue", import.meta.url), { recursive: true, force: true });
  const now = "2026-01-02T03:04:06.000Z";
  const job = JSON.parse(rta([
    "queue",
    "enqueue",
    "meeting-digest.integrated.fixture",
    "--input",
    "tests/fixtures/custom-transcript.txt",
    "--high",
  ], { env: { RTA_NOW: now } }));
  assert.equal(job.status, "queued");
  assert.equal(job.createdAt, now);

  const out = rta(["scheduler", "start", "--once"], { env: { RTA_NOW: "2026-01-02T03:04:07.000Z" } });
  assert.match(out, new RegExp(`job=${job.id}`));

  const queue = JSON.parse(rta(["queue", "list"]));
  assert.equal(queue[0].status, "completed");
  assert.ok(queue[0].result.runId);
  assert.match(JSON.stringify(queue[0].result), /meeting-digest-integrated\.json/);
});
