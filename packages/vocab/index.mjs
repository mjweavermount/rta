import { readFileSync } from "node:fs";

export function loadAppDeclaration(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateAppDeclaration(app) {
  const errors = [];
  if (!app.name) errors.push("app is missing name");
  if (!Array.isArray(app.vocabulary) || app.vocabulary.length === 0) errors.push("app must declare vocabulary");
  if (!Array.isArray(app.useCases) || app.useCases.length === 0) errors.push("app must declare useCases");
  if (!Array.isArray(app.scenarios) || app.scenarios.length === 0) errors.push("app must declare scenarios");

  for (const item of app.vocabulary ?? []) {
    if (!item.id) errors.push("vocabulary item is missing id");
    if (!item.extends) errors.push(`vocabulary ${item.id ?? "(unknown)"} must extend an abstract primitive, pattern, or archetype`);
    if (item.abstract === true) errors.push(`app vocabulary ${item.id} must be concrete, not abstract`);
  }

  return errors;
}

export function summarizeAppDeclaration(app) {
  return {
    name: app.name,
    vocabulary: app.vocabulary?.map((item) => `${item.id} extends ${item.extends}`) ?? [],
    useCases: app.useCases?.map((item) => item.id) ?? [],
    scenarios: app.scenarios?.map((item) => item.id) ?? [],
    boundaries: app.boundaries?.map((item) => `${item.from}->${item.to}`) ?? [],
  };
}
