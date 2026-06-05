#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const args = process.argv.slice(2);
const scenario = args.includes("--v1") ? "meeting-digest.v1.fixture" : "meeting-digest.v2.fixture";
const review = args.includes("--review") ? ["--review"] : [];
const high = args.includes("--high") ? ["--high"] : [];
const inputIndex = args.indexOf("--input");
const input = inputIndex >= 0 ? ["--input", args[inputIndex + 1]] : [];

const res = spawnSync("node", ["scripts/rta.mjs", "scenario", "run", scenario, ...review, ...high, ...input], {
  cwd: root,
  stdio: "inherit",
});
process.exit(res.status ?? 1);
