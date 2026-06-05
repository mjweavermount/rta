import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { CeremonyLogger } from "../packages/logging/index.mjs";

function rta(args) {
  return execFileSync("node", ["scripts/rta.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
}

test("persistent queue enqueues and runs a meeting digest job", () => {
  const enqueued = JSON.parse(rta([
    "queue",
    "enqueue",
    "meeting-digest.integrated.fixture",
    "--input",
    "tests/fixtures/custom-transcript.txt",
    "--review",
  ]));
  assert.equal(enqueued.status, "queued");
  rta(["queue", "run-next"]);
  const jobs = JSON.parse(rta(["queue", "list"]));
  assert.equal(jobs.find((job) => job.id === enqueued.id).status, "completed");
});

test("generator creates arbitrary app scaffold", () => {
  const out = rta(["generate", "app", ".rta/generated/scaffold/test-app"]).trim();
  assert.ok(existsSync(`${out}/rta.app.json`));
  assert.ok(existsSync(`${out}/bin/meeting-digest.mjs`));
});

test("grafana renderer writes a dashboard artifact", () => {
  const out = rta(["grafana", "render", "meeting-digest"]).trim();
  const dashboard = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(dashboard.title, "RTA meeting-digest Run Monitor");
  assert.ok(dashboard.panels.some((panel) => panel.title.includes("provenance")));
});

test("home-lab deployment package renders WorkloadApp draft", () => {
  const out = rta(["hosting", "package", "meeting-digest"]).trim();
  assert.ok(existsSync(`${out}/app.yaml`));
  assert.ok(existsSync(`${out}/application.yaml`));
  assert.ok(existsSync(`${out}/manifests/deployment.yaml`));
  assert.match(readFileSync(`${out}/app.yaml`, "utf8"), /apiVersion: lab.virgil.info\/v1alpha1/);
});

test("security rejects escaping input paths and redacts secret-like logs", () => {
  assert.throws(() => rta(["scenario", "run", "meeting-digest.integrated.fixture", "--input", "../outside.txt"]), /path escapes RTA root/);

  const lines = [];
  const logger = new CeremonyLogger({ sink: (line) => lines.push(line), verbosity: "high" });
  logger.step({
    runId: "security-test",
    step: "secret.redaction",
    input: { token: "abc123", nested: "password=hunter2" },
    output: "api_key=abc123",
    detail: { secret: "nope" },
  });
  const joined = lines.join("\n");
  assert.doesNotMatch(joined, /abc123|hunter2|nope/);
  assert.match(joined, /<redacted>/);
});
