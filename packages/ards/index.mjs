import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".ard.json") ? [path] : [];
  });
}

export function loadArds(root) {
  return walk(join(root, "ards"))
    .sort()
    .map((path) => ({ path, ...JSON.parse(readFileSync(path, "utf8")) }));
}

export function validateArds(root) {
  const errors = [];
  const ids = new Set();
  for (const ard of loadArds(root)) {
    for (const field of ["id", "title", "tier", "status", "supports", "enforcedBy", "decision"]) {
      if (ard[field] == null || (Array.isArray(ard[field]) && ard[field].length === 0)) {
        errors.push(`${ard.path} missing ${field}`);
      }
    }
    if (ids.has(ard.id)) errors.push(`duplicate ARD id ${ard.id}`);
    ids.add(ard.id);
    if (!["proposed", "accepted", "superseded"].includes(ard.status)) {
      errors.push(`${ard.id} has invalid status ${ard.status}`);
    }
  }
  return errors;
}
