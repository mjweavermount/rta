import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { findWorkItem, loadWorkLedger } from "../packages/work-ledger/index.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);

test("work ledger loads current capabilities", () => {
  const items = loadWorkLedger(root);
  assert.ok(items.length >= 16);
  assert.ok(items.every((item) => item.id));
  assert.ok(items.some((item) => item.id === "meeting-digest-proving-app"));
});

test("work item lookup supports ids", () => {
  const item = findWorkItem(root, "work-ledger");
  assert.equal(item.name, "WorkLedger");
});
