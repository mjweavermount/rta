import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  assert.match(out, /meetingDigest.v2.digest/);
  assert.match(out, /review=/);
});
