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
  const ards = loadArds(root);
  const byId = new Map();
  for (const ard of ards) {
    for (const field of ["id", "kind", "family", "title", "status", "supports", "decision"]) {
      if (ard[field] == null || (Array.isArray(ard[field]) && ard[field].length === 0)) {
        errors.push(`${ard.path} missing ${field}`);
      }
    }
    if (byId.has(ard.id)) errors.push(`duplicate ARD id ${ard.id}`);
    byId.set(ard.id, ard);
    if (!["proposed", "accepted", "superseded"].includes(ard.status)) {
      errors.push(`${ard.id} has invalid status ${ard.status}`);
    }
    if (!["spirit", "letter"].includes(ard.kind)) {
      errors.push(`${ard.id} has invalid kind ${ard.kind}`);
    }
    if (ard.family && ard.id && !ard.id.startsWith(familyPrefix(ard.family))) {
      errors.push(`${ard.id} family ${ard.family} does not match prefix ${familyPrefix(ard.family)}`);
    }
  }

  for (const ard of ards) {
    if (ard.kind === "spirit") {
      if (!Array.isArray(ard.letters) || ard.letters.length === 0) {
        errors.push(`${ard.id} spirit ARD must declare at least one letter`);
      }
      if (ard.checks?.length > 0) errors.push(`${ard.id} spirit ARD must not declare checks`);
      if (ard.spirit?.length > 0) errors.push(`${ard.id} spirit ARD must not reference another spirit`);
      for (const letterId of ard.letters ?? []) {
        const letter = byId.get(letterId);
        if (!letter) {
          errors.push(`${ard.id} references missing letter ${letterId}`);
        } else if (!letter.spirit?.includes(ard.id)) {
          errors.push(`${ard.id} and ${letterId} are not reciprocal`);
        }
      }
    }

    if (ard.kind === "letter") {
      if (ard.letters?.length > 0) errors.push(`${ard.id} letter ARD must not declare letters`);
      if (!Array.isArray(ard.checks) || ard.checks.length === 0) {
        errors.push(`${ard.id} letter ARD must declare at least one check`);
      }
      if (!Array.isArray(ard.spirit) || ard.spirit.length === 0) {
        errors.push(`${ard.id} letter ARD must reference at least one spirit`);
      }
      for (const spiritId of ard.spirit ?? []) {
        const spirit = byId.get(spiritId);
        if (!spirit) {
          errors.push(`${ard.id} references missing spirit ${spiritId}`);
        } else if (spirit.kind !== "spirit") {
          errors.push(`${ard.id} references ${spiritId}, which is not a spirit ARD`);
        } else if (!spirit.letters?.includes(ard.id)) {
          errors.push(`${ard.id} and ${spiritId} are not reciprocal`);
        }
      }
      for (const check of ard.checks ?? []) {
        if (!check.description) errors.push(`${ard.id} check missing description`);
        if (!check.command) errors.push(`${ard.id} check missing command`);
      }
    }
  }
  return errors;
}

function familyPrefix(family) {
  return `ARD-RTA-${family.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}
