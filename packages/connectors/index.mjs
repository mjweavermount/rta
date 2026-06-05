import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function publishDryRun({ root, reviewItem, target = "fixture", connectorPolicy = null }) {
  if (reviewItem.status !== "approved") {
    throw new Error(`review ${reviewItem.id} is ${reviewItem.status}; publication requires approved review`);
  }
  if (!connectorPolicy) {
    throw new Error("publication requires declared connector policy");
  }
  if (connectorPolicy.mode !== "dry-run" || connectorPolicy.externalWrites !== false) {
    throw new Error(`connector ${connectorPolicy.id ?? "(unknown)"} is not safe for dry-run publication`);
  }
  if (connectorPolicy.requiresReview !== true) {
    throw new Error(`connector ${connectorPolicy.id ?? "(unknown)"} must require review`);
  }
  if (!connectorPolicy.allowedTargets?.includes(target)) {
    throw new Error(`target ${target} is not allowed by connector ${connectorPolicy.id ?? "(unknown)"}`);
  }
  const outDir = join(root, ".rta", "published");
  mkdirSync(outDir, { recursive: true });
  const publication = {
    id: `pub-${reviewItem.id}`,
    mode: "dry-run",
    target,
    connector: connectorPolicy.id,
    dataSensitivity: connectorPolicy.dataSensitivity,
    reviewId: reviewItem.id,
    artifactPath: reviewItem.artifactPath,
    publishedAt: nowIso(),
    externalWrites: [],
  };
  const path = join(outDir, `${publication.id}.json`);
  writeFileSync(path, JSON.stringify(publication, null, 2));
  return { ...publication, path };
}

function nowIso() {
  return process.env.RTA_NOW || new Date().toISOString();
}
