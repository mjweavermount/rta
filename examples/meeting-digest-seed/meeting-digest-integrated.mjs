import { loadAppDeclaration } from "../../packages/vocab/index.mjs";
import { buildDerivationGraph } from "../../packages/derivation/index.mjs";
import { digestTranscriptV2 } from "./meeting-digest-v2.mjs";

export function digestTranscriptIntegrated(text) {
  const base = digestTranscriptV2(text);
  return integrateDigest(base);
}

export function integrateDigest(base, { enrichmentAvailable = true, mode = "bulk" } = {}) {
  const app = loadAppDeclaration(new URL("./rta.app.json", import.meta.url));
  const graph = buildDerivationGraph(app);
  const obligations = graph.nodes
    .filter((node) => node.type === "obligation")
    .map((node) => node.id.replace(/^obligation:[^:]+:/, "").replace(/^obligation:/, ""));

  return {
    ...base,
    version: "integrated-v3",
    rta: {
      app: app.name,
      mode,
      vocabulary: app.vocabulary.map((item) => ({ id: item.id, extends: item.extends })),
      useCases: app.useCases.map((item) => item.id),
      obligations,
      generatedBy: "rta.app.json + derivation graph + scenario runtime",
      enrichment: enrichmentAvailable
        ? { status: "available", sources: ["local fixture declarations", "RTA derivation graph"] }
        : { status: "unavailable", sources: [], note: "No AFFiNE/local enrichment source was available; digest keeps transcript-only confidence." },
    },
    tasks: base.tasks.map((task) => ({
      ...task,
      rtaObligations: obligationsForTask(task, obligations),
    })),
    provenance: {
      ...base.provenance,
      derivationNodes: graph.nodes.length,
      derivationEdges: graph.edges.length,
      strategy: "RTA integrated declaration + derivation + v2 digest engine",
    },
  };
}

export function workItemSpecsFromDigest(digest) {
  return digest.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    goal: task.goal,
    user: task.user,
    systems: task.systems,
    talksTo: task.talksTo,
    largerSystem: task.largerSystem,
    classification: task.classification,
    sourceTopic: task.sourceTopic,
    confidence: task.confidence,
    rtaObligations: task.rtaObligations ?? [],
    reviewRequired: true,
    publication: {
      allowedAdapter: "dry-run-fixture",
      externalWrites: false,
    },
  }));
}

function obligationsForTask(task, obligations) {
  const selected = [];
  selected.push("TaskHasGoal", "TaskHasUser", "TaskHasSystems");
  if (task.classification.includes("automation")) selected.push("ReviewBeforePublication");
  if (task.largerSystem.includes("Logging") || task.largerSystem.includes("Monitoring")) selected.push("HumanReadableLogs");
  selected.push("ScenarioBoundaryCoverage");
  return selected.filter((item) => obligations.includes(item));
}
