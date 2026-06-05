import assert from "node:assert/strict";
import test from "node:test";
import {
  bloomContract,
  bloomVocabulary,
  coreTierContracts,
  requiredOperationEventsFor,
  validateArchetypeBindings,
  validateConcreteVocabulary,
  validatePatternContracts,
  validateTierContracts,
} from "../packages/tiers/index.mjs";

test("core tier contracts are internally valid", () => {
  assert.deepEqual(validateTierContracts(coreTierContracts), []);
  assert.deepEqual(validatePatternContracts(coreTierContracts), []);
  assert.deepEqual(validateArchetypeBindings(coreTierContracts), []);
});

test("tier checks reject unknown parent contracts and weak concrete vocabulary", () => {
  const badContracts = [
    {
      id: "T2.Pattern.Bad",
      tier: "T2",
      kind: "pattern",
      extends: ["T1.DoesNotExist"],
      description: "bad pattern",
      obligations: ["BadObligation"],
      requiredConcreteFields: ["id"],
      requiredOperationEvents: [],
    },
  ];
  assert.match(validateTierContracts(badContracts).join("\n"), /unknown contract|operation events|concrete descriptions/);

  const errors = validateConcreteVocabulary({
    app: { vocabulary: [{ id: "BadConcrete", extends: "T2.Pattern.TopicSegmentation" }] },
  });
  assert.match(errors.join("\n"), /missing inherited required field description/);
});

test("pattern and archetype checks reject invalid bindings", () => {
  const patternErrors = validatePatternContracts([
    ...coreTierContracts,
    {
      id: "T2.Pattern.Invalid",
      tier: "T2",
      kind: "pattern",
      extends: ["T2.Pattern.TopicSegmentation"],
      description: "invalid pattern",
      obligations: ["Invalid"],
      requiredConcreteFields: ["id", "extends", "description"],
      requiredOperationEvents: ["run"],
    },
  ]);
  assert.match(patternErrors.join("\n"), /can only extend primitives/);

  const archetypeErrors = validateArchetypeBindings([
    ...coreTierContracts,
    {
      id: "T3.Archetype.Invalid",
      tier: "T3",
      kind: "archetype",
      extends: ["T1.Input"],
      description: "invalid archetype",
      obligations: ["GenericOnly"],
      requiredConcreteFields: ["id", "extends", "description"],
      requiredOperationEvents: ["run"],
    },
  ]);
  assert.match(archetypeErrors.join("\n"), /role-specific obligations/);
});

test("tier contracts derive required operation event names for app vocabulary", () => {
  const app = {
    vocabulary: [
      { id: "TranscriptInput", extends: "T1.Input", description: "input" },
      { id: "TopicSegmenter", extends: "T2.Pattern.TopicSegmentation", description: "topic segmenter" },
      { id: "DigestArtifact", extends: "T1.Artifact", description: "artifact" },
    ],
  };
  assert.deepEqual(requiredOperationEventsFor(app).map((item) => item.operation), [
    "TranscriptInput.read",
    "TopicSegmenter.read",
    "TopicSegmenter.segment",
    "DigestArtifact.write",
  ]);
});

test("tier blooming carries inherited obligations, fields, and operations", () => {
  const bloom = bloomContract("T2.Pattern.TopicSegmentation");
  assert.deepEqual(bloom.chain.map((item) => item.id), ["T1.Input", "T2.Pattern.TopicSegmentation"]);
  assert.ok(bloom.obligations.includes("InputIsValidated"));
  assert.ok(bloom.obligations.includes("TopicLoopbacksAreHandled"));
  assert.deepEqual(bloom.requiredOperationEvents, ["read", "segment"]);

  const [entry] = bloomVocabulary({
    vocabulary: [{ id: "TopicSegmenter", extends: "T2.Pattern.TopicSegmentation", description: "topic segmenter" }],
  });
  assert.equal(entry.vocabularyId, "TopicSegmenter");
  assert.deepEqual(entry.bloom.requiredConcreteFields, ["id", "extends", "description"]);
});

test("tier checks reject circular tier blooms", () => {
  const errors = validateTierContracts([
    {
      id: "T1.A",
      tier: "T1",
      kind: "primitive",
      extends: ["T1.B"],
      description: "cycle a",
      obligations: ["A"],
      requiredConcreteFields: ["id", "description"],
      requiredOperationEvents: ["a"],
    },
    {
      id: "T1.B",
      tier: "T1",
      kind: "primitive",
      extends: ["T1.A"],
      description: "cycle b",
      obligations: ["B"],
      requiredConcreteFields: ["id", "description"],
      requiredOperationEvents: ["b"],
    },
  ]);
  assert.match(errors.join("\n"), /cycle detected/);
});
