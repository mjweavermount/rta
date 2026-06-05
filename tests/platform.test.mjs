import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

test("generator writes derivation hashes and generated-sync catches drift", () => {
  const out = rta(["generate"]).trim();
  const manifestPath = `${out}/derivation-manifest.json`;
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.generated.policy, "always-regenerated");
  assert.match(manifest.generated.derivationHash, /^[a-f0-9]{16}$/);
  assert.ok(manifest.content.files.includes("app-runtime.schema.json"));
  const runtimeSchema = JSON.parse(readFileSync(`${out}/app-runtime.schema.json`, "utf8"));
  assert.equal(runtimeSchema.content.title, "RTA AppRuntime");
  assert.ok(runtimeSchema.content.properties.process.enum.includes("worker"));
  assert.match(rta(["check", "--generated-sync"]), /Generated sync passed/);

  writeFileSync(`${out}/obligations.json`, "{}\n");
  assert.throws(() => rta(["check", "--generated-sync"]), /generated file drifted: obligations.json/);
  rta(["generate"]);
  assert.match(rta(["check", "--generated-sync"]), /Generated sync passed/);
  assert.match(rta(["check", "--production"]), /Production passed/);
});

test("grafana renderer writes a dashboard artifact", () => {
  const out = rta(["grafana", "render", "meeting-digest"]).trim();
  const dashboard = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(dashboard.title, "RTA meeting-digest Run Monitor");
  assert.ok(dashboard.panels.some((panel) => panel.title.includes("provenance")));
  assert.ok(dashboard.rta.telemetry.some((item) => item.id === "telemetry:meeting-digest.integrated.fixture:run-status"));
  assert.match(JSON.stringify(dashboard), /rta_run_status/);
  assert.match(JSON.stringify(dashboard), /rta_run_duration_seconds/);
  assert.match(JSON.stringify(dashboard), /rta_run_artifact_count/);
  assert.match(JSON.stringify(dashboard), /rta_review_state/);
  assert.match(rta(["check", "--telemetry-coverage"]), /Telemetry coverage passed/);
});

test("home-lab deployment package renders WorkloadApp draft", () => {
  const intentPath = rta(["hosting", "intent", "meeting-digest"]).trim();
  const intent = JSON.parse(readFileSync(intentPath, "utf8"));
  assert.equal(intent.optionalHomeLab, true);
  assert.match(intent.image, /ghcr\.io\/mjweavermount\/rta\/meeting-digest/);

  const out = rta(["hosting", "package", "meeting-digest"]).trim();
  assert.ok(existsSync(`${out}/app.yaml`));
  assert.ok(existsSync(`${out}/application.yaml`));
  assert.ok(existsSync(`${out}/Containerfile`));
  assert.ok(existsSync(`${out}/health-server.mjs`));
  assert.ok(existsSync(`${out}/manifests/deployment.yaml`));
  assert.ok(existsSync(`${out}/manifests/healthcheck.yaml`));
  assert.match(readFileSync(`${out}/app.yaml`, "utf8"), /apiVersion: lab.virgil.info\/v1alpha1/);
  assert.match(readFileSync(`${out}/manifests/deployment.yaml`, "utf8"), /readinessProbe/);
  assert.match(readFileSync(`${out}/manifests/deployment.yaml`, "utf8"), /ghcr\.io\/mjweavermount\/rta\/meeting-digest:0\.1\.0/);
  assert.match(rta(["hosting", "validate", "meeting-digest"]), /Hosting package passed/);
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
