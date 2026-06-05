import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDerivationGraph, deriveAll, explainDerivation } from "../packages/derivation/index.mjs";

const app = JSON.parse(readFileSync(new URL("../examples/meeting-digest-seed/rta.app.json", import.meta.url), "utf8"));

test("derivation engine produces stable obligations and source chains", () => {
  const all = deriveAll(app);
  assert.ok(all.obligations.some((item) => item.id === "obligation:ReviewBeforePublication"));
  assert.ok(all.obligations.some((item) => item.id === "obligation:WorkItemExtractor:TaskHasGoal"));
  assert.ok(all.obligations.some((item) => item.id === "obligation:WorkItemExtractor:InputIsValidated"));
  assert.ok(all.operationLogs.some((item) => item.id === "log:TopicSegmenter.read"));
  assert.ok(all.operationLogs.some((item) => item.id === "log:TopicSegmenter.segment"));
  assert.ok(all.operationLogs.some((item) => item.id === "log:ReviewableDigestJob.write"));
  assert.ok(all.reviewGates.some((item) => item.id === "review-gate:meeting-digest:publication"));
  assert.ok(all.telemetry.some((item) => item.requiredCheck === "rta check --telemetry-coverage"));
  assert.ok(all.boundaryCoverage.some((item) => item.requiredCheck === "rta check --boundary-coverage"));
  assert.equal(all.runtimeContract.id, "runtime:meeting-digest");
});

test("derivation graph links concrete bindings to derived items", () => {
  const graph = buildDerivationGraph(app);
  assert.ok(graph.nodes.some((node) => node.id === "log:TopicSegmenter.read"));
  assert.ok(graph.nodes.some((node) => node.id === "log:TopicSegmenter.segment"));
  assert.ok(graph.edges.some((edge) => edge.from === "T1.Input" && edge.to === "log:TopicSegmenter.read" && edge.type === "derives"));
  assert.ok(graph.edges.some((edge) => edge.from === "TopicSegmenter" && edge.to === "log:TopicSegmenter.segment" && edge.type === "binds"));
  assert.ok(graph.edges.some((edge) => edge.from === "T2.Pattern.TopicSegmentation" && edge.to === "TopicSegmenter"));
});

test("explainDerivation returns incoming derivation source chain", () => {
  const explanation = explainDerivation("review-gate:meeting-digest:publication", app);
  assert.equal(explanation.node.id, "review-gate:meeting-digest:publication");
  assert.ok(explanation.incoming.some((edge) => edge.from === "publication.requiresReview"));
  assert.ok(explanation.incoming.some((edge) => edge.from === "meeting-digest"));
});
