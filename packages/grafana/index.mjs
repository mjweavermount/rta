import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function renderGrafanaDashboard({ root, appName = "meeting-digest" }) {
  const outDir = join(root, ".rta", "grafana");
  mkdirSync(outDir, { recursive: true });
  const dashboard = {
    title: `RTA ${appName} Run Monitor`,
    tags: ["rta", appName],
    timezone: "browser",
    schemaVersion: 39,
    version: 1,
    panels: [
      {
        type: "logs",
        title: "Human-readable ceremony logs",
        gridPos: { x: 0, y: 0, w: 24, h: 8 },
        targets: [{ refId: "A", expr: `{app="${appName}"} |= "meetingDigest"` }],
      },
      {
        type: "table",
        title: "Review queue decisions",
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [{ refId: "B", expr: `{app="${appName}"} |= "review="` }],
      },
      {
        type: "nodeGraph",
        title: "Run provenance graph",
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [{ refId: "C", expr: `{app="${appName}"} |= "provenance"` }],
      },
    ],
  };
  const path = join(outDir, `${appName}.dashboard.json`);
  writeFileSync(path, JSON.stringify(dashboard, null, 2));
  return path;
}
