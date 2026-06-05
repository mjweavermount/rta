import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateArds } from "../packages/ards/index.mjs";

test("repo ARDs satisfy reciprocal spirit and letter loop", () => {
  const root = new URL("..", import.meta.url).pathname;
  assert.deepEqual(validateArds(root), []);
});

test("ARD metadata rejects non-reciprocal and unchecked letter families", () => {
  const root = join(tmpdir(), `rta-bad-ards-${Date.now()}`);
  const dir = join(root, "ards", "bad");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spirit.ard.json"), JSON.stringify({
    id: "ARD-RTA-BAD-000",
    kind: "spirit",
    family: "bad",
    title: "Bad Spirit",
    status: "accepted",
    letters: ["ARD-RTA-BAD-001"],
    supports: ["bad"],
    decision: "bad",
  }, null, 2));
  writeFileSync(join(dir, "letter.ard.json"), JSON.stringify({
    id: "ARD-RTA-BAD-001",
    kind: "letter",
    family: "bad",
    title: "Bad Letter",
    status: "accepted",
    spirit: [],
    supports: ["bad"],
    checks: [],
    decision: "bad",
  }, null, 2));
  const errors = validateArds(root).join("\n");
  assert.match(errors, /not reciprocal|at least one check|at least one spirit/);
});
