import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateArds } from "../ards/index.mjs";
import { buildDerivationGraph } from "../derivation/index.mjs";
import { loadAppDeclaration, validateAppDeclaration } from "../vocab/index.mjs";

export function checkApp({ root, appDir }) {
  const appPath = join(root, appDir, "rta.app.json");
  if (!existsSync(appPath)) return [`missing ${appDir}/rta.app.json`];

  const app = loadAppDeclaration(appPath);
  const errors = validateAppDeclaration(app);

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
  const graph = buildDerivationGraph(app);
  const required = ["ReviewBeforePublication", "HumanReadableLogs", "ScenarioBoundaryCoverage"];
  return required
    .filter((id) => !graph.nodes.some((node) => node.id === id))
    .map((id) => `missing derived obligation ${id}`);
}

export function checkLogCeremony({ root, appDir }) {
  const app = loadAppDeclaration(join(root, appDir, "rta.app.json"));
  const template = app.logging?.humanReadableTemplate ?? "";
  return ["{runId}", "{step}", "{actor}", "{input}", "{output}"]
    .filter((token) => !template.includes(token))
    .map((token) => `logging template missing ${token}`);
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
