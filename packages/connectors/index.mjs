import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function publishDryRun({ root, reviewItem, target = "fixture" }) {
  if (reviewItem.status !== "approved") {
    throw new Error(`review ${reviewItem.id} is ${reviewItem.status}; publication requires approved review`);
  }
  const outDir = join(root, ".rta", "published");
  mkdirSync(outDir, { recursive: true });
  const publication = {
    id: `pub-${reviewItem.id}`,
    mode: "dry-run",
    target,
    reviewId: reviewItem.id,
    artifactPath: reviewItem.artifactPath,
    publishedAt: new Date().toISOString(),
    externalWrites: [],
  };
  const path = join(outDir, `${publication.id}.json`);
  writeFileSync(path, JSON.stringify(publication, null, 2));
  return { ...publication, path };
}
