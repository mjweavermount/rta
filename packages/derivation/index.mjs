import { bloomContract, coreTierContracts, requiredOperationEventsFor } from "../tiers/index.mjs";

export function explainMeetingDigestObligation() {
  return explainDerivation("obligation:ReviewBeforePublication");
}

export function deriveAll(app, contracts = coreTierContracts) {
  return {
    obligations: deriveObligations(app, contracts),
    telemetry: deriveTelemetry(app),
    operationLogs: deriveOperationLogs(app, contracts),
    reviewGates: deriveReviewGates(app),
    useCaseObligations: deriveUseCaseObligations(app),
    scenarioCoverage: deriveScenarioCoverage(app),
    boundaryCoverage: deriveBoundaryCoverage(app),
    provenance: deriveProvenance(app),
    runtimeContract: deriveRuntimeContract(app),
  };
}

export function deriveObligations(app, contracts = coreTierContracts) {
  const derived = [];
  for (const vocab of app.vocabulary ?? []) {
    const inherited = bloomContract(vocab.extends, contracts);
    for (const contract of inherited?.chain ?? []) {
      for (const obligation of contract.obligations ?? []) {
        derived.push(derivedItem({
          id: `obligation:${vocab.id}:${obligation}`,
          kind: "obligation",
          sourceTier: contract.tier,
          source: contract.id,
          binding: vocab.id,
          expectedGeneratedArtifact: `generated/obligations/${vocab.id}.${obligation}.test.mjs`,
          requiredCheck: "rta check --obligation-coverage",
          explanation: `${vocab.id} inherits ${obligation} from ${contract.id}.`,
        }));
      }
    }
  }
  if (app.publication?.requiresReview) {
    derived.push(derivedItem({
      id: "obligation:ReviewBeforePublication",
      kind: "obligation",
      sourceTier: "runtime",
      source: "publication.requiresReview",
      binding: app.name,
      expectedGeneratedArtifact: "generated/review-gates/review-before-publication.mjs",
      requiredCheck: "rta check --review-gates",
      explanation: "External publication requires an approved review artifact before writes.",
    }));
  }
  derived.push(derivedItem({
    id: "obligation:HumanReadableLogs",
    kind: "obligation",
    sourceTier: "runtime",
    source: "logging.humanReadableTemplate",
    binding: app.name,
    expectedGeneratedArtifact: "generated/logging/operation-logs.mjs",
    requiredCheck: "rta check --operation-logging",
    explanation: "Runs must produce human-readable and structured operation logs.",
  }));
  return uniqueById(derived);
}

export function deriveTelemetry(app) {
  return (app.scenarios ?? []).map((scenario) => derivedItem({
    id: `telemetry:${scenario.id}:run-status`,
    kind: "telemetry",
    sourceTier: "scenario",
    source: scenario.id,
    binding: app.name,
    expectedGeneratedArtifact: `generated/telemetry/${scenario.id}.telemetry.json`,
    requiredCheck: "rta check --telemetry-coverage",
    explanation: `${scenario.id} must expose run status, duration, artifact count, and review state.`,
  }));
}

export function deriveOperationLogs(app, contracts = coreTierContracts) {
  return requiredOperationEventsFor(app, contracts).map((requirement) => derivedItem({
    id: `log:${requirement.operation}`,
    kind: "operation-log",
    sourceTier: requirement.sourceContract.split(".")[0],
    source: requirement.sourceContract,
    binding: requirement.vocabularyId,
    operation: requirement.operation,
    expectedGeneratedArtifact: `generated/logging/${requirement.operation}.operation-log.json`,
    requiredCheck: "rta check --operation-logging",
    explanation: `${requirement.operation} must log start, complete, failed, input summary, and output summary.`,
  }));
}

export function deriveReviewGates(app) {
  if (!app.publication?.requiresReview) return [];
  return [derivedItem({
    id: `review-gate:${app.name}:publication`,
    kind: "review-gate",
    sourceTier: "runtime",
    source: "publication.requiresReview",
    binding: app.name,
    expectedGeneratedArtifact: "generated/review-gates/publication.gate.json",
    requiredCheck: "rta check --review-gates",
    explanation: `${app.name} publication adapters must reject pending or rejected review items.`,
  })];
}

export function deriveUseCaseObligations(app) {
  return (app.useCases ?? []).map((useCase) => derivedItem({
    id: `use-case:${useCase.id}:scenario-coverage`,
    kind: "use-case-obligation",
    sourceTier: "use-case",
    source: useCase.id,
    binding: app.name,
    expectedGeneratedArtifact: `generated/use-cases/${useCase.id}.scenario.test.mjs`,
    requiredCheck: "rta check --use-cases",
    explanation: `${useCase.id} must be covered by at least one executable scenario.`,
  }));
}

export function deriveScenarioCoverage(app) {
  return (app.scenarios ?? []).map((scenario) => derivedItem({
    id: `scenario:${scenario.id}:expected-artifacts`,
    kind: "scenario-coverage",
    sourceTier: "scenario",
    source: scenario.id,
    binding: app.name,
    expectedGeneratedArtifact: `generated/scenarios/${scenario.id}.coverage.json`,
    requiredCheck: "rta check --scenario-coverage",
    explanation: `${scenario.id} must produce its declared expected artifacts and checkable run events.`,
  }));
}

export function deriveBoundaryCoverage(app) {
  return (app.boundaries ?? []).map((boundary) => derivedItem({
    id: `boundary:${boundary.from}->${boundary.to}`,
    kind: "boundary-coverage",
    sourceTier: "boundary",
    source: `${boundary.from}->${boundary.to}`,
    binding: app.name,
    expectedGeneratedArtifact: `generated/boundaries/${boundary.from}-to-${boundary.to}.test.mjs`,
    requiredCheck: "rta check --boundary-coverage",
    explanation: `The ${boundary.from} to ${boundary.to} boundary must be covered by a declared scenario.`,
  }));
}

export function deriveProvenance(app) {
  return [
    ...deriveOperationLogs(app).map((item) => derivedItem({
      id: `provenance:${item.operation}`,
      kind: "provenance",
      sourceTier: item.sourceTier,
      source: item.id,
      binding: item.binding,
      expectedGeneratedArtifact: `generated/provenance/${item.operation}.edge.json`,
      requiredCheck: "rta check --derived-obligations",
      explanation: `${item.operation} log events must emit provenance edges.`,
    })),
  ];
}

export function deriveRuntimeContract(app) {
  return {
    id: `runtime:${app.name}`,
    kind: "runtime-contract",
    app: app.name,
    processes: ["cli", "scenario-runner", "worker"],
    ports: ["artifact-store", "review-queue", "scheduler-queue", "log-sink", "provenance-store"],
    targets: ["memory", "local", "production-dry-run"],
    requiredCheck: "rta check --runtime-wiring",
    explanation: "Generated app CLI, scenario runner, and worker must use the same runtime ports.",
  };
}

export function buildDerivationGraph(app) {
  const all = deriveAll(app);
  const derived = [
    ...all.obligations,
    ...all.telemetry,
    ...all.operationLogs,
    ...all.reviewGates,
    ...all.useCaseObligations,
    ...all.scenarioCoverage,
    ...all.boundaryCoverage,
    ...all.provenance,
    all.runtimeContract,
  ];
  const nodes = [
    { id: app.name, type: "app" },
    ...(app.vocabulary ?? []).map((item) => ({ id: item.id, type: "vocabulary", extends: item.extends })),
    ...(app.useCases ?? []).map((item) => ({ id: item.id, type: "use-case" })),
    ...(app.scenarios ?? []).map((item) => ({ id: item.id, type: "scenario" })),
    ...(app.boundaries ?? []).map((item) => ({ id: `boundary:${item.from}->${item.to}`, type: "boundary" })),
    ...derived.map((item) => ({ id: item.id, type: item.kind, source: item.source, binding: item.binding })),
  ];

  const edges = [];
  for (const item of app.vocabulary ?? []) edges.push({ from: item.extends, to: item.id, type: "concretizes" });
  for (const item of derived) {
    edges.push({ from: item.source, to: item.id, type: "derives" });
    if (item.binding) edges.push({ from: item.binding, to: item.id, type: "binds" });
  }
  for (const useCase of app.useCases ?? []) {
    edges.push({ from: app.name, to: useCase.id, type: "declares-use-case" });
    for (const scenario of useCase.scenarios ?? []) edges.push({ from: useCase.id, to: scenario, type: "covered-by" });
  }
  for (const boundary of app.boundaries ?? []) {
    for (const scenario of boundary.coveredBy ?? []) edges.push({ from: scenario, to: `boundary:${boundary.from}->${boundary.to}`, type: "covers-boundary" });
  }

  return { nodes: uniqueById(nodes), edges };
}

export function explainDerivation(id, app = null) {
  if (app) {
    const graph = buildDerivationGraph(app);
    const node = graph.nodes.find((item) => item.id === id);
    const incoming = graph.edges.filter((edge) => edge.to === id);
    return { id, node, incoming };
  }
  return {
    id,
    item: "ReviewGate",
    sourceTier: "runtime",
    source: "publication.requiresReview",
    binding: "meeting-digest",
    requiredCheck: "rta check --review-gates",
    explanation: "Outputs that affect external systems must enter human review before publication.",
  };
}

function derivedItem(item) {
  return item;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
