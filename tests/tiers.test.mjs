import assert from "node:assert/strict";
import test from "node:test";
import {
  coreTierContracts,
  requiredCeremonyOperationsFor,
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
      requiredCeremonyOperations: [],
    },
  ];
  assert.match(validateTierContracts(badContracts).join("\n"), /unknown contract|ceremony operations|concrete descriptions/);

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
      requiredCeremonyOperations: ["run"],
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
      requiredCeremonyOperations: ["run"],
    },
  ]);
  assert.match(archetypeErrors.join("\n"), /role-specific obligations/);
});

test("tier contracts derive required ceremony operation names for app vocabulary", () => {
  const app = {
    vocabulary: [
      { id: "TranscriptInput", extends: "T1.Input", description: "input" },
      { id: "TopicSegmenter", extends: "T2.Pattern.TopicSegmentation", description: "topic segmenter" },
      { id: "DigestArtifact", extends: "T1.Artifact", description: "artifact" },
    ],
  };
  assert.deepEqual(requiredCeremonyOperationsFor(app).map((item) => item.operation), [
    "TranscriptInput.read",
    "TopicSegmenter.segment",
    "DigestArtifact.write",
  ]);
});
