#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publishDryRun } from "../packages/connectors/index.mjs";
import { explainMeetingDigestObligation } from "../packages/derivation/index.mjs";
import { checkApp } from "../packages/checks/index.mjs";
import { CeremonyLogger } from "../packages/logging/index.mjs";
import { ReviewQueue } from "../packages/review/index.mjs";
import { FileRuntime, createRunId } from "../packages/runtime/index.mjs";
import { runScenario } from "../packages/use-cases/index.mjs";
import { findWorkItem, loadWorkLedger, summarizeWorkItem } from "../packages/work-ledger/index.mjs";
import { loadAppDeclaration, summarizeAppDeclaration } from "../packages/vocab/index.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);

async function main() {
  const [cmd, sub, ...rest] = args;
  if (!cmd || cmd === "help" || cmd === "--help") return usage();

  if (cmd === "work") return work(sub, rest);
  if (cmd === "check") return check(sub);
  if (cmd === "init") return init(rest[0] ?? "examples/hello-rta");
  if (cmd === "context") return context();
  if (cmd === "explain") return explain(rest);
  if (cmd === "scenario") return scenarioCommand(sub, rest);
  if (cmd === "demo" && sub === "run") return runNamedScenario("meeting-digest.v2.fixture", { review: true, verbosity: rest.includes("--high") ? "high" : "normal" });
  if (cmd === "review") return review(sub, rest);
  if (cmd === "publish") return publish(sub, rest);

  throw new Error(`unknown command: ${args.join(" ")}`);
}

function usage() {
  console.log(`rta

Commands:
  rta work list
  rta work show <id>
  rta check --work-ledger
  rta check --meeting-digest
  rta init [dir]
  rta context
  rta explain obligation meeting-digest
  rta scenario list
  rta scenario run <name> [--high] [--review]
  rta demo run [--high]
  rta review show <id>
  rta review approve <id> --actor <name>
  rta review reject <id> --actor <name>
  rta publish dry-run <review-id> [--target fixture]`);
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
  throw new Error("usage: rta check --work-ledger | --meeting-digest");
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
    implementedCommands: ["work", "check", "init", "context", "explain", "scenario", "demo", "review", "publish"],
  }, null, 2));
}

function explain(rest) {
  if (rest.join(" ").includes("meeting-digest")) {
    console.log(JSON.stringify(explainMeetingDigestObligation(), null, 2));
    return;
  }
  console.log(JSON.stringify(explainMeetingDigestObligation(), null, 2));
}

async function scenarioCommand(sub, rest) {
  const scenarios = await loadMeetingDigestScenarios();
  if (sub === "list") {
    for (const scenario of scenarios) console.log(scenario.name);
    return;
  }
  if (sub === "run") {
    return runNamedScenario(rest[0], { review: rest.includes("--review"), verbosity: rest.includes("--high") ? "high" : "normal" });
  }
  throw new Error("usage: rta scenario list | run <name>");
}

async function loadMeetingDigestScenarios() {
  const mod = await import(pathToFileURL(join(root, "examples/meeting-digest-seed/app.mjs")).href);
  return mod.scenarios;
}

async function runNamedScenario(name, { review: shouldReview = false, verbosity = "normal" } = {}) {
  const scenarios = await loadMeetingDigestScenarios();
  const selected = scenarios.find((scenario) => scenario.name === name);
  if (!selected) throw new Error(`unknown scenario: ${name}`);

  const runId = createRunId(name.replace(/[^a-z0-9]+/gi, "-"));
  const runtime = new FileRuntime({ root, runId });
  const logger = new CeremonyLogger({ verbosity });
  const result = await runScenario({ scenario: selected, runtime, logger });
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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
