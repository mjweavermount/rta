#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const errors = [];

if (pkg.private !== false) errors.push("package must be publishable or explicitly marked private=false for release hygiene");
if (!pkg.name?.startsWith("@mjweavermount/")) errors.push("package name must use @mjweavermount scope");
if (!pkg.version || pkg.version === "0.0.0") errors.push("package version must be release-shaped");
if (!pkg.bin?.rta) errors.push("package must expose rta bin");
if (!pkg.exports?.["."]) errors.push("package must expose root export");
for (const requiredScript of ["check", "check:production", "check:release", "audit", "doctor"]) {
  if (!pkg.scripts?.[requiredScript]) errors.push(`package missing script ${requiredScript}`);
}
for (const requiredFile of ["pnpm-lock.yaml", ".github/workflows/checks.yml", "packages/index.mjs"]) {
  if (!existsSync(join(root, requiredFile))) errors.push(`missing ${requiredFile}`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Release hygiene passed.");
