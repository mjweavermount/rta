import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function rta(args) {
  return execFileSync("node", ["scripts/rta.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
}

test("cli lists work and explains meeting digest obligation", () => {
  const list = rta(["work", "list"]);
  assert.match(list, /meeting-digest-proving-app/);
  const explanation = rta(["explain", "obligation", "meeting-digest"]);
  assert.match(explanation, /ReviewGate/);
  assert.match(rta(["check", "--meeting-digest"]), /passed/);
  assert.match(rta(["check", "--ard-meta"]), /passed/);
  assert.match(rta(["check", "--extensions-local"]), /passed/);
  assert.match(rta(["check", "--extensions-upstreamable"]), /passed/);
  assert.match(rta(["check", "--derived-obligations"]), /passed/);
  assert.match(rta(["check", "--log-ceremony"]), /passed/);
  assert.match(rta(["check", "--security"]), /passed/);
  assert.match(rta(["check", "--all"]), /All implemented RTA checks passed/);
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
