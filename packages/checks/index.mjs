import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateArds } from "../ards/index.mjs";
import { buildDerivationGraph, deriveAll } from "../derivation/index.mjs";
import { checkGeneratedSync } from "../generators/index.mjs";
import { renderGrafanaDashboard } from "../grafana/index.mjs";
import { requiredCeremonyOperationsFor, validateArchetypeBindings, validateConcreteVocabulary, validatePatternContracts, validateTierContracts } from "../tiers/index.mjs";
import { loadAppDeclaration, validateAppDeclaration } from "../vocab/index.mjs";

export function checkApp({ root, appDir }) {
  const appPath = join(root, appDir, "rta.app.json");
  if (!existsSync(appPath)) return [`missing ${appDir}/rta.app.json`];

  const app = loadAppDeclaration(appPath);
  const errors = validateAppDeclaration(app);
  errors.push(...validateConcreteVocabulary({ app }));

  const scenarioIds = new Set((app.scenarios ?? []).map((scenario) => scenario.id));
  for (const useCase of app.useCases ?? []) {
    if (!useCase.scenarios?.some((id) => scenarioIds.has(id))) {
      errors.push(`use case ${useCase.id} is not covered by a declared scenario`);
    }
  }

  for (const boundary of app.boundaries ?? []) {
    if (!boundary.coveredBy?.some((id) => scenarioIds.has(id))) {
      errors.push(`boundary ${boundary.from}->${boundary.to} is not covered by a declared scenario`);
    }
  }

  if (!app.logging?.humanReadableTemplate) {
    errors.push("app must declare logging.humanReadableTemplate");
  }

  if (app.publication?.requiresReview !== true) {
    errors.push("publication.requiresReview must be true");
  }

  return errors;
}

export function checkArds({ root }) {
  return validateArds(root);
}

export function checkExtensions({ root, appDir, upstreamable = false }) {
  const path = join(root, appDir, "extensions.json");
  if (!existsSync(path)) return [`missing ${appDir}/extensions.json`];
  const data = JSON.parse(readFileSync(path, "utf8"));
  const errors = [];
  for (const extension of data.extensions ?? []) {
    if (!extension.id) errors.push("extension missing id");
    if (!extension.extends) errors.push(`${extension.id ?? "(unknown)"} missing extends`);
    if (extension.concrete !== true) errors.push(`${extension.id} must be concrete`);
    if (!extension.localReason) errors.push(`${extension.id} missing localReason`);
    if (upstreamable && extension.upstreamCandidate && (!extension.upstreamRequires || extension.upstreamRequires.length === 0)) {
      errors.push(`${extension.id} marked upstreamCandidate without upstreamRequires`);
    }
  }
  return errors;
}

export function checkDerivation({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const all = deriveAll(app);
  const graph = buildDerivationGraph(app);
  const required = [
    "obligation:ReviewBeforePublication",
    "obligation:HumanReadableLogs",
    "review-gate:meeting-digest:publication",
    "runtime:meeting-digest",
  ];
  const ids = new Set(graph.nodes.map((node) => node.id));
  const errors = required
    .filter((id) => !ids.has(id))
    .map((id) => `missing derived item ${id}`);
  if (all.logCeremonies.length === 0) errors.push("missing derived log ceremonies");
  if (all.telemetry.length === 0) errors.push("missing derived telemetry expectations");
  if (all.boundaryCoverage.length === 0) errors.push("missing derived boundary coverage");
  return errors;
}

export function checkTierContracts({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  return [
    ...validateTierContracts(),
    ...validateConcreteVocabulary({ app }),
  ];
}

export function checkPatternContracts() {
  return validatePatternContracts();
}

export function checkArchetypeBindings() {
  return validateArchetypeBindings();
}

export function checkLogCeremony({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const template = app.logging?.humanReadableTemplate ?? "";
  const errors = ["{runId}", "{step}", "{actor}", "{input}", "{output}"]
    .filter((token) => !template.includes(token))
    .map((token) => `logging template missing ${token}`);
  const ceremonies = app.logging?.ceremonies ?? [];
  if (!Array.isArray(ceremonies) || ceremonies.length === 0) {
    errors.push("logging.ceremonies must declare required operation ceremonies");
    return errors;
  }

  for (const requirement of requiredCeremonyOperationsFor(app)) {
    if (!ceremonies.some((ceremony) => ceremony.for === requirement.vocabularyId && ceremony.operation === requirement.operation)) {
      errors.push(`vocabulary ${requirement.vocabularyId} missing required log ceremony ${requirement.operation} from ${requirement.sourceContract}`);
    }
  }

  for (const ceremony of ceremonies) {
    if (!ceremony.for) errors.push("log ceremony missing for");
    if (!ceremony.operation) errors.push(`log ceremony ${ceremony.for ?? "(unknown)"} missing operation`);
    for (const event of ["start", "complete", "failed"]) {
      if (!ceremony.requiredEvents?.includes(event)) {
        errors.push(`log ceremony ${ceremony.operation ?? ceremony.for ?? "(unknown)"} missing ${event} event`);
      }
    }
    for (const summary of ["input", "output"]) {
      if (!ceremony.summaries?.includes(summary)) {
        errors.push(`log ceremony ${ceremony.operation ?? ceremony.for ?? "(unknown)"} missing ${summary} summary`);
      }
    }
  }
  return errors;
}

export function checkSecurity({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const errors = [];
  if (app.security?.inputPathPolicy !== "repo-contained") errors.push("security.inputPathPolicy must be repo-contained");
  if (app.security?.redactSecrets !== true) errors.push("security.redactSecrets must be true");
  if (app.publication?.requiresReview !== true) errors.push("publication.requiresReview must be true");
  if (!Array.isArray(app.publication?.adapters) || app.publication.adapters.length === 0) errors.push("publication.adapters must declare allowed adapters");
  return errors;
}

export function checkUseCases({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const errors = [];
  const scenarioIds = new Set((app.scenarios ?? []).map((scenario) => scenario.id));
  if (!Array.isArray(app.useCases) || app.useCases.length === 0) errors.push("app must declare at least one use case");
  for (const useCase of app.useCases ?? []) {
    if (!useCase.id) errors.push("use case missing id");
    if (!useCase.actor) errors.push(`${useCase.id ?? "(unknown)"} missing actor`);
    if (!useCase.goal) errors.push(`${useCase.id ?? "(unknown)"} missing goal`);
    if (!useCase.scenarios?.length) errors.push(`${useCase.id ?? "(unknown)"} missing scenarios`);
    for (const scenario of useCase.scenarios ?? []) {
      if (!scenarioIds.has(scenario)) errors.push(`${useCase.id} references unknown scenario ${scenario}`);
    }
  }
  return errors;
}

export function checkScenarioCoverage({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const errors = [];
  const vocabIds = new Set((app.vocabulary ?? []).map((item) => item.id));
  const covered = new Set();
  for (const scenario of app.scenarios ?? []) {
    if (!scenario.id) errors.push("scenario missing id");
    if (!scenario.mode) errors.push(`${scenario.id ?? "(unknown)"} missing mode`);
    if (!scenario.expectedArtifacts?.length) errors.push(`${scenario.id ?? "(unknown)"} missing expectedArtifacts`);
    if (!scenario.coversVocabulary?.length) errors.push(`${scenario.id ?? "(unknown)"} missing coversVocabulary`);
    for (const vocab of scenario.coversVocabulary ?? []) {
      if (!vocabIds.has(vocab)) errors.push(`${scenario.id} covers unknown vocabulary ${vocab}`);
      covered.add(vocab);
    }
  }
  for (const vocab of vocabIds) {
    if (!covered.has(vocab)) errors.push(`vocabulary ${vocab} is not covered by any scenario`);
  }
  return errors;
}

export function checkBoundaryCoverage({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const errors = [];
  const scenarioIds = new Set((app.scenarios ?? []).map((scenario) => scenario.id));
  if (!Array.isArray(app.boundaries) || app.boundaries.length === 0) errors.push("app must declare bounded-context boundaries");
  for (const boundary of app.boundaries ?? []) {
    if (!boundary.from || !boundary.to) errors.push("boundary missing from/to");
    if (!boundary.coveredBy?.length) errors.push(`boundary ${boundary.from ?? "?"}->${boundary.to ?? "?"} missing coveredBy`);
    for (const scenario of boundary.coveredBy ?? []) {
      if (!scenarioIds.has(scenario)) errors.push(`boundary ${boundary.from}->${boundary.to} references unknown scenario ${scenario}`);
    }
  }
  return errors;
}

export function checkIntegrationContracts({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const errors = [];
  const boundaries = new Set((app.boundaries ?? []).map((boundary) => `${boundary.from}->${boundary.to}`));
  if (app.publication?.requiresReview !== true) errors.push("external write path must be review-gated");
  if (!boundaries.has("review->publication")) errors.push("external publication must have review->publication boundary coverage");
  if (!app.publication?.adapters?.includes("dry-run-fixture")) errors.push("production fixture must include dry-run-fixture adapter");
  return errors;
}

export function checkTelemetryCoverage({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const all = deriveAll(app);
  const errors = [];
  if (all.telemetry.length === 0) errors.push("missing derived telemetry expectations");

  for (const item of all.telemetry) {
    if (item.requiredCheck !== "rta check --telemetry-coverage") {
      errors.push(`${item.id} must require rta check --telemetry-coverage`);
    }
    if (!item.explanation?.includes("run status") || !item.explanation?.includes("artifact count") || !item.explanation?.includes("review state")) {
      errors.push(`${item.id} must explain run status, artifact count, and review state`);
    }
  }

  const dashboardPath = renderGrafanaDashboard({ root, appName: app.name });
  const dashboard = JSON.parse(readFileSync(dashboardPath, "utf8"));
  const derivedTelemetryIds = new Set(all.telemetry.map((item) => item.id));
  const dashboardTelemetryIds = new Set((dashboard.rta?.telemetry ?? []).map((item) => item.id));
  for (const id of derivedTelemetryIds) {
    if (!dashboardTelemetryIds.has(id)) errors.push(`dashboard missing derived telemetry ${id}`);
  }

  const panelText = JSON.stringify(dashboard.panels ?? []);
  for (const required of ["rta_run_status", "rta_run_duration_seconds", "rta_run_artifact_count", "rta_review_state", "provenance"]) {
    if (!panelText.includes(required)) errors.push(`dashboard missing ${required}`);
  }

  for (const scenario of app.scenarios ?? []) {
    const templatingText = JSON.stringify(dashboard.templating ?? {});
    if (!templatingText.includes(scenario.id)) errors.push(`dashboard scenario selector missing ${scenario.id}`);
  }

  return errors;
}

export function checkProduction({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  return [
    ...checkApp({ root, appDir }),
    ...checkArds({ root }),
    ...checkTierContracts({ root, appDir }),
    ...checkPatternContracts({ root }),
    ...checkArchetypeBindings({ root }),
    ...checkExtensions({ root, appDir }),
    ...checkDerivation({ root, appDir }),
    ...checkLogCeremony({ root, appDir }),
    ...checkUseCases({ root, appDir }),
    ...checkScenarioCoverage({ root, appDir }),
    ...checkBoundaryCoverage({ root, appDir }),
    ...checkIntegrationContracts({ root, appDir }),
    ...checkTelemetryCoverage({ root, appDir }),
    ...checkSecurity({ root, appDir }),
    ...checkGeneratedSync({ root, app }),
  ];
}
