import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const ledgerKinds = new Map([
  ["capabilities", "Capability"],
  ["features", "Feature"],
  ["decisions", "Decision"],
  ["research", "Research"],
  ["upstream-candidates", "UpstreamCandidate"],
]);

function walk(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return walk(path);
      return path.endsWith(".yaml") || path.endsWith(".yml") ? [path] : [];
    })
    .sort();
}

function parseScalar(line) {
  const match = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
  return match ? [match[1], match[2]] : null;
}

function parseLedgerYaml(text) {
  const out = {};
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const scalar = parseScalar(line);
    if (scalar) {
      const [key, value] = scalar;
      current = key;
      out[key] = value.length > 0 ? value : [];
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch && current) {
      if (!Array.isArray(out[current])) out[current] = [];
      out[current].push(listMatch[1]);
      continue;
    }

    const objectMatch = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.+)$/);
    if (objectMatch && current) {
      if (Array.isArray(out[current])) out[current] = {};
      out[current][objectMatch[1]] = objectMatch[2];
    }
  }
  return out;
}

export function loadWorkLedger(root) {
  const workRoot = join(root, "work");
  const items = [];
  for (const [dirName, expectedKind] of ledgerKinds.entries()) {
    const dir = join(workRoot, dirName);
    let files = [];
    try {
      files = walk(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      const data = parseLedgerYaml(readFileSync(file, "utf8"));
      if (!data.kind) data.kind = expectedKind;
      data.path = file;
      data.slug = basename(file).replace(/\.(capability|feature|decision|research|upstream)\.ya?ml$/, "");
      items.push(data);
    }
  }
  return items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function findWorkItem(root, idOrName) {
  return loadWorkLedger(root).find((item) => item.id === idOrName || item.name === idOrName);
}

export function summarizeWorkItem(item) {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    status: item.status,
    why: item.why,
    ownedBy: item.ownedBy ?? {},
    demonstratedBy: item.demonstratedBy ?? [],
    qaSteps: item.qaSteps ?? [],
    requires: item.requires ?? [],
    produces: item.produces ?? [],
    selfAudit: item.selfAudit ?? [],
  };
}
