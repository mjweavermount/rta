import { resolve, relative } from "node:path";

const secretPatterns = [
  /token\s*[:=]\s*[A-Za-z0-9_.-]+/gi,
  /password\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
];

export function assertInsideRoot(root, path) {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(root, path);
  const rel = relative(resolvedRoot, resolvedPath);
  if (rel.startsWith("..") || rel === "" || rel.startsWith("/")) {
    throw new Error(`path escapes RTA root: ${path}`);
  }
  return resolvedPath;
}

export function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return secretPatterns.reduce((text, pattern) => text.replace(pattern, (match) => `${match.split(/[:=]/)[0]}=<redacted>`), value);
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /token|password|secret|api[_-]?key/i.test(key) ? "<redacted>" : redactSecrets(item),
    ]));
  }
  return value;
}
