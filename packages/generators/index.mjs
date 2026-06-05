import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function generateAppCli({ root, app }) {
  const outDir = join(root, ".rta", "generated", app.name);
  mkdirSync(outDir, { recursive: true });
  const defaultScenario = app.scenarios?.find((scenario) => scenario.id.includes("integrated"))?.id ?? app.scenarios?.[0]?.id;
  const content = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const args = process.argv.slice(2);
const scenarioIndex = args.indexOf("--scenario");
const scenario = scenarioIndex >= 0 ? args[scenarioIndex + 1] : ${JSON.stringify(defaultScenario)};
const passthrough = scenarioIndex >= 0
  ? args.filter((arg, index) => index !== scenarioIndex && index !== scenarioIndex + 1)
  : args;
const res = spawnSync("node", ["scripts/rta.mjs", "scenario", "run", scenario, ...passthrough], {
  cwd: root,
  stdio: "inherit",
});
process.exit(res.status ?? 1);
`;
  const path = join(outDir, `${app.name}.mjs`);
  writeFileSync(path, content, { mode: 0o755 });
  return path;
}
