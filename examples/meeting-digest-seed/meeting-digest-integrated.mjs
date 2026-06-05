import { loadAppDeclaration } from "../../packages/vocab/index.mjs";
import { buildDerivationGraph } from "../../packages/derivation/index.mjs";
import { digestTranscriptV2 } from "./meeting-digest-v2.mjs";

export function digestTranscriptIntegrated(text) {
  const base = digestTranscriptV2(text);
  return integrateDigest(base);
}

export function integrateDigest(base) {
  const app = loadAppDeclaration(new URL("./rta.app.json", import.meta.url));
  const graph = buildDerivationGraph(app);
  const obligations = graph.nodes.filter((node) => node.type === "obligation").map((node) => node.id);

  return {
    ...base,
    version: "integrated-v3",
    rta: {
      app: app.name,
      vocabulary: app.vocabulary.map((item) => ({ id: item.id, extends: item.extends })),
      useCases: app.useCases.map((item) => item.id),
      obligations,
      generatedBy: "rta.app.json + derivation graph + scenario runtime",
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

function obligationsForTask(task, obligations) {
  const selected = [];
  if (task.classification.includes("automation")) selected.push("ReviewBeforePublication");
  if (task.largerSystem.includes("Logging") || task.largerSystem.includes("Monitoring")) selected.push("HumanReadableLogs");
  selected.push("ScenarioBoundaryCoverage");
  return selected.filter((item) => obligations.includes(item));
}
