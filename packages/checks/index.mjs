import { existsSync } from "node:fs";
import { join } from "node:path";
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
