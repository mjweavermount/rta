#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publishDryRun } from "../packages/connectors/index.mjs";
import { explainMeetingDigestObligation } from "../packages/derivation/index.mjs";
import { renderGrafanaDashboard } from "../packages/grafana/index.mjs";
import { renderHomeLabDeploymentPackage, renderHomeLabIntent } from "../packages/hosting-adapters/index.mjs";
import { checkApp, checkArds, checkDerivation, checkExtensions, checkLogCeremony, checkSecurity } from "../packages/checks/index.mjs";
import { buildDerivationGraph } from "../packages/derivation/index.mjs";
import { generateAppCli, generateAppScaffold } from "../packages/generators/index.mjs";
import { CeremonyLogger } from "../packages/logging/index.mjs";
import { ReviewQueue } from "../packages/review/index.mjs";
import { FileRuntime, createRunId } from "../packages/runtime/index.mjs";
import { FileQueue } from "../packages/scheduler/index.mjs";
import { assertInsideRoot } from "../packages/security/index.mjs";
import { runScenario } from "../packages/use-cases/index.mjs";
import { findWorkItem, loadWorkLedger, summarizeWorkItem } from "../packages/work-ledger/index.mjs";
import { loadAppDeclaration, summarizeAppDeclaration } from "../packages/vocab/index.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const requiredCommands = [
  "init",
  "context",
  "generate",
  "check",
  "lint",
  "explain",
  "graph",
  "dev",
  "run",
  "review",
  "scenario",
  "test-scenario",
  "work",
  "extensions",
  "upstream",
  "doctor",
];
const implementedCommands = [
  "init",
  "context",
  "generate",
  "check",
  "lint",
  "explain",
  "graph",
  "dev",
  "run",
  "review",
  "scenario",
  "test-scenario",
  "work",
  "extensions",
  "upstream",
  "doctor",
  "demo",
  "publish",
  "hosting",
  "queue",
  "grafana",
];

async function main() {
  const [cmd, sub, ...rest] = args;
  if (!cmd || cmd === "help" || cmd === "--help") return usage();

  if (cmd === "work") return work(sub, rest);
  if (cmd === "check") return check(sub);
  if (cmd === "init") return init(rest[0] ?? "examples/hello-rta");
  if (cmd === "context") return context();
  if (cmd === "explain") return explain(rest);
  if (cmd === "graph") return graph(sub, rest);
  if (cmd === "generate") return generate(sub, rest);
  if (cmd === "scenario") return scenarioCommand(sub, rest);
  if (cmd === "test-scenario") return testScenario(sub, rest);
  if (cmd === "run") return runCommand(sub, rest);
  if (cmd === "dev") return dev(sub, rest);
  if (cmd === "lint") return lint(rest);
  if (cmd === "extensions") return extensions(sub, rest);
  if (cmd === "upstream") return upstream(sub, rest);
  if (cmd === "doctor") return doctor();
  if (cmd === "demo" && sub === "run") return runNamedScenario("meeting-digest.v2.fixture", optionsFrom(rest, { review: true }));
  if (cmd === "review") return review(sub, rest);
  if (cmd === "publish") return publish(sub, rest);
  if (cmd === "hosting") return hosting(sub, rest);
  if (cmd === "queue") return queue(sub, rest);
  if (cmd === "grafana") return grafana(sub, rest);

  throw new Error(`unknown command: ${args.join(" ")}`);
}

function usage() {
  console.log(`rta

Commands:
  rta work list
  rta work show <id>
  rta check --work-ledger
  rta check --meeting-digest
  rta check --ard-meta
  rta check --extensions-local
  rta check --extensions-upstreamable
  rta check --derived-obligations
  rta check --log-ceremony
  rta check --security
  rta check --all
  rta lint
  rta doctor
  rta graph
  rta dev
  rta run scenario <name> [--input transcript.txt] [--high] [--review]
  rta generate app-cli
  rta generate app <out-dir>
  rta queue enqueue <scenario> [--input transcript.txt] [--review] [--high]
  rta queue run-next
  rta queue list
  rta grafana render [meeting-digest]
  rta init [dir]
  rta context
  rta explain obligation meeting-digest
  rta scenario list
  rta scenario run <name> [--input transcript.txt] [--high] [--review]
  rta scenario watch <name> [--input transcript.txt] [--high|--trace] [--review]
  rta test-scenario list
  rta test-scenario run <name>
  rta extensions list
  rta upstream plan <extension>
  rta demo run [--input transcript.txt] [--high]
  rta review show <id>
  rta review approve <id> --actor <name>
  rta review reject <id> --actor <name>
  rta publish dry-run <review-id> [--target fixture]
  rta hosting render [meeting-digest]
  rta hosting package [meeting-digest] [--lab-root /path/to/home-lab-v7]`);
}

function work(sub, rest) {
  if (sub === "list") {
    for (const item of loadWorkLedger(root)) {
      console.log(`${item.id}\t${item.kind}\t${item.status}\t${item.name}`);
    }
    return;
  }
  if (sub === "show") {
    const item = findWorkItem(root, rest[0]);
    if (!item) throw new Error(`unknown work item: ${rest[0]}`);
    console.log(JSON.stringify(summarizeWorkItem(item), null, 2));
    return;
  }
  throw new Error("usage: rta work list | show <id>");
}

async function check(flag) {
  if (flag === "--work-ledger") {
    await import("./check-work-ledger.mjs");
    return;
  }
  if (flag === "--meeting-digest") {
    const errors = checkApp({ root, appDir: "examples/meeting-digest-seed" });
    if (errors.length > 0) {
      console.error(errors.map((error) => `- ${error}`).join("\n"));
      process.exit(1);
    }
    console.log("Meeting digest app declaration passed.");
    return;
  }
  if (flag === "--ard-meta") return reportCheck("ARD metadata", checkArds({ root }));
  if (flag === "--extensions-local") return reportCheck("Local extensions", checkExtensions({ root, appDir: "examples/meeting-digest-seed" }));
  if (flag === "--extensions-upstreamable") return reportCheck("Upstreamable extensions", checkExtensions({ root, appDir: "examples/meeting-digest-seed", upstreamable: true }));
  if (flag === "--derived-obligations") return reportCheck("Derived obligations", checkDerivation({ root, appDir: "examples/meeting-digest-seed" }));
  if (flag === "--log-ceremony") return reportCheck("Log ceremony", checkLogCeremony({ root, appDir: "examples/meeting-digest-seed" }));
  if (flag === "--security") return reportCheck("Security", checkSecurity({ root, appDir: "examples/meeting-digest-seed" }));
  if (flag === "--app-cli") {
    const app = loadAppDeclaration(join(root, "examples/meeting-digest-seed/rta.app.json"));
    const generated = generateAppCli({ root, app });
    console.log(`Generated app CLI: ${generated}`);
    return;
  }
  if (flag === "--all") {
    await import("./check-work-ledger.mjs");
    const errors = [
      ...checkApp({ root, appDir: "examples/meeting-digest-seed" }),
      ...checkArds({ root }),
      ...checkExtensions({ root, appDir: "examples/meeting-digest-seed" }),
      ...checkExtensions({ root, appDir: "examples/meeting-digest-seed", upstreamable: true }),
      ...checkDerivation({ root, appDir: "examples/meeting-digest-seed" }),
      ...checkLogCeremony({ root, appDir: "examples/meeting-digest-seed" }),
      ...checkSecurity({ root, appDir: "examples/meeting-digest-seed" }),
    ];
    if (errors.length > 0) {
      console.error(errors.map((error) => `- ${error}`).join("\n"));
      process.exit(1);
    }
    console.log("All implemented RTA checks passed.");
    return;
  }
  throw new Error("usage: rta check --work-ledger | --meeting-digest | --ard-meta | --extensions-local | --extensions-upstreamable | --derived-obligations | --log-ceremony | --security | --app-cli | --all");
}

function reportCheck(label, errors) {
  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }
  console.log(`${label} passed.`);
}

function init(dir) {
  const target = resolve(root, dir);
  mkdirSync(target, { recursive: true });
  const appFile = join(target, "rta.app.json");
  if (!existsSync(appFile)) {
    writeFileSync(appFile, JSON.stringify({
      name: "hello-rta",
      useCases: ["RunHelloScenario"],
      scenarios: ["hello.fixture"],
      generatedFiles: [],
    }, null, 2));
  }
  console.log(`initialized ${target}`);
}

function context() {
  const app = loadAppDeclaration(join(root, "examples/meeting-digest-seed/rta.app.json"));
  console.log(JSON.stringify({
    project: "RTA",
    repo: root,
    workItems: loadWorkLedger(root).length,
    provingApp: summarizeAppDeclaration(app),
    requiredCommands,
    implementedCommands,
  }, null, 2));
}

function explain(rest) {
  if (rest.join(" ").includes("graph")) {
    const app = loadAppDeclaration(join(root, "examples/meeting-digest-seed/rta.app.json"));
    console.log(JSON.stringify(buildDerivationGraph(app), null, 2));
    return;
  }
  if (rest.join(" ").includes("meeting-digest")) {
    console.log(JSON.stringify(explainMeetingDigestObligation(), null, 2));
    return;
  }
  console.log(JSON.stringify(explainMeetingDigestObligation(), null, 2));
}

function graph(sub, rest) {
  if (sub && sub !== "show") throw new Error("usage: rta graph [show]");
  return explain(["graph", ...rest]);
}

function generate(sub) {
  const app = loadAppDeclaration(join(root, "examples/meeting-digest-seed/rta.app.json"));
  if (sub === "app-cli") {
    console.log(generateAppCli({ root, app }));
    return;
  }
  if (sub === "app") {
    const outDir = args[2] ?? ".rta/generated/scaffold/meeting-digest";
    console.log(generateAppScaffold({ root, app, outDir }));
    return;
  }
  throw new Error("usage: rta generate app-cli | app <out-dir>");
}

async function testScenario(sub, rest) {
  if (sub === "list" || !sub) return scenarioCommand("list", rest);
  if (sub === "run") return runNamedScenario(rest[0], optionsFrom(rest.slice(1)));
  throw new Error("usage: rta test-scenario list | run <name>");
}

async function runCommand(sub, rest) {
  if (sub === "scenario") return runNamedScenario(rest[0], optionsFrom(rest.slice(1)));
  throw new Error("usage: rta run scenario <name>");
}

async function dev(sub, rest) {
  if (!sub || sub === "status") {
    console.log(JSON.stringify({
      mode: "dev",
      status: "warning",
      warning: "rta dev is a local warning surface; rta check --production is ticketed but not implemented yet.",
      nextTickets: ["rta-prod-06-check-production", "rta-prod-08-runtime-unit-of-work"],
      checks: {
        workLedger: "available",
        implementedChecks: "available",
        productionGate: "planned",
      },
    }, null, 2));
    return;
  }
  if (sub === "check") return check("--all");
  throw new Error("usage: rta dev [status|check]");
}

function lint() {
  const app = loadAppDeclaration(join(root, "examples/meeting-digest-seed/rta.app.json"));
  const errors = [];
  for (const item of app.vocabulary ?? []) {
    if (!item.description) errors.push(`vocabulary ${item.id} missing description`);
    if (!item.extends) errors.push(`vocabulary ${item.id} missing extends`);
  }
  if (!app.publication?.adapters?.length) errors.push("publication adapters must be explicit");
  if (app.security?.externalWritesRequireReview !== true) errors.push("external write behavior must be explicit");
  return reportCheck("Lint", errors);
}

function extensions(sub) {
  if (sub !== "list" && sub !== "health" && sub) throw new Error("usage: rta extensions [list|health]");
  const data = JSON.parse(readFileSync(join(root, "examples/meeting-digest-seed/extensions.json"), "utf8"));
  const rows = (data.extensions ?? []).map((extension) => ({
    id: extension.id,
    extends: extension.extends,
    scope: "app-local",
    status: extension.upstreamCandidate ? "candidate" : "local-safe",
    upstreamRequires: extension.upstreamRequires ?? [],
  }));
  console.log(JSON.stringify(rows, null, 2));
}

function upstream(sub, rest) {
  if (sub === "plan") {
    const id = rest[0];
    if (!id) throw new Error("usage: rta upstream plan <extension>");
    const data = JSON.parse(readFileSync(join(root, "examples/meeting-digest-seed/extensions.json"), "utf8"));
    const extension = (data.extensions ?? []).find((item) => item.id === id);
    if (!extension) throw new Error(`unknown extension: ${id}`);
    console.log(JSON.stringify({
      extension: id,
      canPromoteNow: false,
      reason: "Promotion is planned; this command currently reports upstream gaps only.",
      upstreamRequires: extension.upstreamRequires ?? [],
      requiredTicket: "rta-prod-10-review-connector-safety",
    }, null, 2));
    return;
  }
  if (sub === "promote") {
    throw new Error("rta upstream promote is not implemented; run rta upstream plan <extension> and complete rta-prod-02/04/05 first");
  }
  throw new Error("usage: rta upstream plan|promote <extension>");
}

async function doctor() {
  const checks = [];
  const implemented = new Set(implementedCommands);
  checks.push({
    name: "required command surface",
    status: requiredCommands.every((command) => implemented.has(command)) ? "pass" : "fail",
    commands: requiredCommands,
  });
  checks.push({
    name: "work ledger",
    status: "pass",
    count: loadWorkLedger(root).length,
  });
  checks.push({
    name: "production gate",
    status: "planned",
    ticket: "rta-prod-06-check-production",
  });
  console.log(JSON.stringify({ status: "pass-with-planned-work", checks }, null, 2));
}

async function scenarioCommand(sub, rest) {
  const scenarios = await loadMeetingDigestScenarios();
  if (sub === "list") {
    for (const scenario of scenarios) console.log(scenario.name);
    return;
  }
  if (sub === "run") {
    return runNamedScenario(rest[0], optionsFrom(rest));
  }
  if (sub === "watch") {
    return runNamedScenario(rest[0], optionsFrom(rest, { verbosity: "trace" }));
  }
  throw new Error("usage: rta scenario list | run <name> | watch <name>");
}

async function loadMeetingDigestScenarios() {
  const mod = await import(pathToFileURL(join(root, "examples/meeting-digest-seed/app.mjs")).href);
  return mod.scenarios;
}

function optionsFrom(rest, defaults = {}) {
  const inputIndex = rest.indexOf("--input");
  return {
    review: defaults.review ?? rest.includes("--review"),
    verbosity: rest.includes("--trace") ? "trace" : rest.includes("--high") ? "high" : defaults.verbosity ?? "normal",
    input: inputIndex >= 0 ? { transcriptPath: assertInsideRoot(root, rest[inputIndex + 1]) } : {},
  };
}

async function runNamedScenario(name, { review: shouldReview = false, verbosity = "normal", input = {} } = {}) {
  const scenarios = await loadMeetingDigestScenarios();
  const selected = scenarios.find((scenario) => scenario.name === name);
  if (!selected) throw new Error(`unknown scenario: ${name}`);

  const runId = createRunId(name.replace(/[^a-z0-9]+/gi, "-"));
  const runtime = new FileRuntime({ root, runId });
  const logger = new CeremonyLogger({ verbosity, onEvent: (event) => runtime.recordStep(event) });
  const result = await runScenario({ scenario: selected, runtime, logger, input });
  runtime.saveArtifact("logs.json", logger.events);

  if (shouldReview) {
    const queue = new ReviewQueue({ root });
    const item = queue.create({
      runId,
      title: `Review ${selected.name}`,
      artifactPath: result.artifactPath,
      summary: `${result.topics?.length ?? 0} topics, ${result.tasks?.length ?? 0} tasks`,
    });
    runtime.saveState({ review: item });
    console.log(`review=${item.id}`);
  }

  console.log(`run=${runId}`);
  console.log(`artifact=${result.artifactPath}`);
  if (result.markdownPath) console.log(`digest=${result.markdownPath}`);
}

function review(sub, rest) {
  const queue = new ReviewQueue({ root });
  if (sub === "show") {
    console.log(JSON.stringify(queue.show(rest[0]), null, 2));
    return;
  }
  if (sub === "approve" || sub === "reject") {
    const actorIndex = rest.indexOf("--actor");
    const actor = actorIndex >= 0 ? rest[actorIndex + 1] : "unknown";
    console.log(JSON.stringify(queue.decide(rest[0], { status: sub === "approve" ? "approved" : "rejected", actor }), null, 2));
    return;
  }
  throw new Error("usage: rta review show|approve|reject ...");
}

function publish(sub, rest) {
  if (sub !== "dry-run") throw new Error("usage: rta publish dry-run <review-id>");
  const targetIndex = rest.indexOf("--target");
  const target = targetIndex >= 0 ? rest[targetIndex + 1] : "fixture";
  const queue = new ReviewQueue({ root });
  const item = queue.show(rest[0]);
  console.log(JSON.stringify(publishDryRun({ root, reviewItem: item, target }), null, 2));
}

function hosting(sub, rest) {
  const appName = rest[0] ?? "meeting-digest";
  if (sub === "render") {
    console.log(renderHomeLabIntent({ root, appName }));
    return;
  }
  if (sub === "package") {
    const labRootIndex = rest.indexOf("--lab-root");
    const labRoot = labRootIndex >= 0 ? resolve(rest[labRootIndex + 1]) : null;
    if (labRoot) {
      console.log(renderHomeLabDeploymentPackage({
        root,
        appName,
        baseDir: join(labRoot, "tmp/workload-apps"),
        manifestPath: `tmp/workload-apps/${appName}/manifests`,
      }));
      return;
    }
    console.log(renderHomeLabDeploymentPackage({ root, appName }));
    return;
  }
  throw new Error("usage: rta hosting render|package [meeting-digest]");
}

async function queue(sub, rest) {
  const q = new FileQueue({ root });
  if (sub === "enqueue") {
    const scenario = rest[0];
    if (!scenario) throw new Error("usage: rta queue enqueue <scenario>");
    const job = q.enqueue({ scenario, ...optionsFrom(rest.slice(1)) });
    console.log(JSON.stringify(job, null, 2));
    return;
  }
  if (sub === "list") {
    console.log(JSON.stringify(q.list(), null, 2));
    return;
  }
  if (sub === "run-next") {
    const job = q.next();
    if (!job) {
      console.log("no queued jobs");
      return;
    }
    q.update(job.id, { status: "running", startedAt: new Date().toISOString() });
    try {
      const result = await runNamedScenario(job.scenario, {
        review: job.review,
        verbosity: job.high ? "high" : "normal",
        input: job.input,
      });
      q.update(job.id, { status: "completed", completedAt: new Date().toISOString(), result });
    } catch (error) {
      q.update(job.id, { status: "failed", completedAt: new Date().toISOString(), error: error.message });
      throw error;
    }
    return;
  }
  throw new Error("usage: rta queue enqueue|list|run-next");
}

function grafana(sub, rest) {
  if (sub !== "render") throw new Error("usage: rta grafana render [meeting-digest]");
  console.log(renderGrafanaDashboard({ root, appName: rest[0] ?? "meeting-digest" }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
