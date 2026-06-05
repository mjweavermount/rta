import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deriveAll } from "../derivation/index.mjs";
import { loadAppDeclaration } from "../vocab/index.mjs";

export function renderGrafanaDashboard({ root, appName = "meeting-digest" }) {
  const outDir = join(root, ".rta", "grafana");
  mkdirSync(outDir, { recursive: true });
  const app = loadDashboardApp({ root, appName });
  const derived = app ? deriveAll(app) : { telemetry: [] };
  const scenarioOptions = derived.telemetry.map((item) => item.source);
  const dashboard = {
    title: `RTA ${appName} Run Monitor`,
    tags: ["rta", appName],
    timezone: "browser",
    schemaVersion: 39,
    version: 1,
    templating: {
      list: [
        {
          name: "scenario",
          type: "custom",
          label: "Scenario",
          query: scenarioOptions.join(","),
          current: { text: "All", value: "$__all" },
          options: scenarioOptions.map((value) => ({ text: value, value, selected: false })),
          includeAll: true,
        },
      ],
    },
    rta: {
      app: appName,
      generatedFrom: "deriveTelemetry",
      telemetry: derived.telemetry.map((item) => ({
        id: item.id,
        scenario: item.source,
        requiredCheck: item.requiredCheck,
      })),
    },
    panels: [
      {
        type: "logs",
        title: "Human-readable ceremony logs",
        gridPos: { x: 0, y: 0, w: 24, h: 8 },
        targets: [{ refId: "A", expr: `{app="${appName}"} |= "rta.step"` }],
      },
      {
        type: "stat",
        title: "Run status by scenario",
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [{ refId: "B", expr: `sum by (scenario,status) (rta_run_status{app="${appName}",scenario=~"$scenario"})` }],
      },
      {
        type: "timeseries",
        title: "Run duration",
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [{ refId: "C", expr: `histogram_quantile(0.95, sum by (le,scenario) (rate(rta_run_duration_seconds_bucket{app="${appName}",scenario=~"$scenario"}[5m])))` }],
      },
      {
        type: "table",
        title: "Artifact count and review state",
        gridPos: { x: 0, y: 16, w: 12, h: 8 },
        targets: [
          { refId: "D", expr: `rta_run_artifact_count{app="${appName}",scenario=~"$scenario"}` },
          { refId: "E", expr: `rta_review_state{app="${appName}",scenario=~"$scenario"}` },
        ],
      },
      {
        type: "nodeGraph",
        title: "Run provenance graph",
        gridPos: { x: 12, y: 16, w: 12, h: 8 },
        targets: [{ refId: "F", expr: `{app="${appName}"} |= "provenance"` }],
      },
    ],
  };
  const path = join(outDir, `${appName}.dashboard.json`);
  writeFileSync(path, JSON.stringify(dashboard, null, 2));
  return path;
}

function loadDashboardApp({ root, appName }) {
  const fixturePath = join(root, "examples", `${appName}-seed`, "rta.app.json");
  if (existsSync(fixturePath)) return loadAppDeclaration(fixturePath);
  return null;
}
