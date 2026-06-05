export const coreTierContracts = [
  {
    id: "T1.Input",
    tier: "T1",
    kind: "primitive",
    description: "A concrete external or internal input accepted by an RTA app.",
    obligations: ["InputIsDescribed", "InputIsValidated", "InputReadIsLogged"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["read"],
  },
  {
    id: "T1.Artifact",
    tier: "T1",
    kind: "primitive",
    description: "A durable output artifact produced by a run.",
    obligations: ["ArtifactIsNamed", "ArtifactWriteIsLogged", "ArtifactHasProvenance"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["write"],
  },
  {
    id: "T1.ReviewGate",
    tier: "T1",
    kind: "primitive",
    description: "A human approval decision before externally visible side effects.",
    obligations: ["ReviewHasActor", "ReviewHasAuditTrail", "ReviewBlocksExternalWrites"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["request", "decide"],
  },
  {
    id: "T2.Pattern.TopicSegmentation",
    tier: "T2",
    kind: "pattern",
    extends: ["T1.Input"],
    description: "A pattern for turning ordered input spans into topic groups.",
    obligations: ["TopicBoundariesAreExplainable", "TopicLoopbacksAreHandled", "TopicSegmentationIsLogged"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["segment"],
  },
  {
    id: "T2.Pattern.TaskExtraction",
    tier: "T2",
    kind: "pattern",
    extends: ["T1.Input"],
    description: "A pattern for extracting concrete work items from source material.",
    obligations: ["TaskHasGoal", "TaskHasUser", "TaskHasSystems", "TaskExtractionIsLogged"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["extract"],
  },
  {
    id: "T3.Archetype.JobProcessor",
    tier: "T3",
    kind: "archetype",
    extends: ["T1.Input", "T1.Artifact"],
    description: "A reusable processing organ for queued or bulk jobs that produces reviewable artifacts.",
    obligations: ["JobHasRunId", "JobHasArtifacts", "JobHasReviewPath", "JobProcessingIsLogged"],
    requiredConcreteFields: ["id", "extends", "description"],
    requiredOperationEvents: ["materialize"],
  },
];

export function contractById(contracts = coreTierContracts) {
  return new Map(contracts.map((contract) => [contract.id, contract]));
}

export function bloomContract(contractId, contracts = coreTierContracts) {
  const byId = contractById(contracts);
  const seen = new Set();
  const visiting = new Set();
  const chain = [];

  function visit(id) {
    const contract = byId.get(id);
    if (!contract) return;
    if (visiting.has(id)) throw new Error(`tier contract cycle detected at ${id}`);
    if (seen.has(id)) return;
    visiting.add(id);
    for (const parentId of contract.extends ?? []) visit(parentId);
    visiting.delete(id);
    seen.add(id);
    chain.push(contract);
  }

  visit(contractId);
  const contract = byId.get(contractId);
  if (!contract) return null;
  return {
    contractId,
    chain,
    obligations: unique(chain.flatMap((item) => item.obligations ?? [])),
    requiredConcreteFields: unique(chain.flatMap((item) => item.requiredConcreteFields ?? [])),
    requiredOperationEvents: unique(chain.flatMap((item) => item.requiredOperationEvents ?? [])),
  };
}

export function bloomVocabulary(app, contracts = coreTierContracts) {
  return (app.vocabulary ?? []).map((vocab) => ({
    vocabularyId: vocab.id,
    vocab,
    bloom: bloomContract(vocab.extends, contracts),
  }));
}

export function validateTierContracts(contracts = coreTierContracts) {
  const errors = [];
  const ids = new Set();
  for (const contract of contracts) {
    if (!contract.id) errors.push("tier contract missing id");
    if (contract.id && ids.has(contract.id)) errors.push(`duplicate tier contract ${contract.id}`);
    ids.add(contract.id);
    if (!["T1", "T2", "T3"].includes(contract.tier)) errors.push(`${contract.id} has invalid tier ${contract.tier}`);
    if (!["primitive", "pattern", "archetype"].includes(contract.kind)) errors.push(`${contract.id} has invalid kind ${contract.kind}`);
    if (!contract.description) errors.push(`${contract.id} missing description`);
    if (!Array.isArray(contract.obligations) || contract.obligations.length === 0) errors.push(`${contract.id} missing obligations`);
    if (!Array.isArray(contract.requiredConcreteFields) || !contract.requiredConcreteFields.includes("description")) {
      errors.push(`${contract.id} must require concrete descriptions`);
    }
    if (!Array.isArray(contract.requiredOperationEvents) || contract.requiredOperationEvents.length === 0) {
      errors.push(`${contract.id} must require operation events`);
    }
  }

  for (const contract of contracts) {
    for (const parent of contract.extends ?? []) {
      if (!ids.has(parent)) errors.push(`${contract.id} extends unknown contract ${parent}`);
    }
    try {
      bloomContract(contract.id, contracts);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return errors;
}

export function validatePatternContracts(contracts = coreTierContracts) {
  const errors = [];
  const byId = contractById(contracts);
  for (const contract of contracts.filter((item) => item.kind === "pattern")) {
    if (!contract.id.startsWith("T2.Pattern.")) errors.push(`${contract.id} pattern id must start with T2.Pattern.`);
    if (!contract.extends?.length) errors.push(`${contract.id} pattern must extend at least one primitive`);
    for (const parentId of contract.extends ?? []) {
      const parent = byId.get(parentId);
      if (!parent) continue;
      if (parent.kind !== "primitive") errors.push(`${contract.id} pattern can only extend primitives; ${parentId} is ${parent.kind}`);
      const inherited = bloomContract(parentId, contracts);
      for (const obligation of inherited?.obligations ?? []) {
        if (contract.obligations?.includes(obligation)) {
          errors.push(`${contract.id} should not duplicate inherited primitive obligation ${obligation}`);
        }
      }
      for (const operation of inherited?.requiredOperationEvents ?? []) {
        if (contract.requiredOperationEvents?.includes(operation)) {
          errors.push(`${contract.id} should not duplicate inherited primitive operation event ${operation}`);
        }
      }
    }
  }
  return errors;
}

export function validateArchetypeBindings(contracts = coreTierContracts) {
  const errors = [];
  const byId = contractById(contracts);
  for (const contract of contracts.filter((item) => item.kind === "archetype")) {
    if (!contract.id.startsWith("T3.Archetype.")) errors.push(`${contract.id} archetype id must start with T3.Archetype.`);
    if (!contract.extends?.length) errors.push(`${contract.id} archetype must bind primitives or patterns`);
    for (const parentId of contract.extends ?? []) {
      const parent = byId.get(parentId);
      if (!parent) continue;
      if (!["primitive", "pattern"].includes(parent.kind)) {
        errors.push(`${contract.id} archetype cannot bind ${parentId} of kind ${parent.kind}`);
      }
      const inherited = bloomContract(parentId, contracts);
      for (const obligation of inherited?.obligations ?? []) {
        if (contract.obligations?.includes(obligation)) {
          errors.push(`${contract.id} should not duplicate inherited obligation ${obligation}`);
        }
      }
      for (const operation of inherited?.requiredOperationEvents ?? []) {
        if (contract.requiredOperationEvents?.includes(operation)) {
          errors.push(`${contract.id} should not duplicate inherited operation event ${operation}`);
        }
      }
    }
    if (!contract.obligations?.some((obligation) => obligation.includes("Job") || obligation.includes("Processing"))) {
      errors.push(`${contract.id} archetype must declare role-specific obligations`);
    }
  }
  return errors;
}

export function validateConcreteVocabulary({ app, contracts = coreTierContracts }) {
  const errors = [];
  const byId = contractById(contracts);
  for (const vocab of app.vocabulary ?? []) {
    const parent = byId.get(vocab.extends);
    if (!parent) {
      errors.push(`vocabulary ${vocab.id ?? "(unknown)"} extends unknown tier contract ${vocab.extends ?? "(missing)"}`);
      continue;
    }
    const inherited = bloomContract(vocab.extends, contracts);
    for (const field of inherited?.requiredConcreteFields ?? []) {
      if (!vocab[field]) errors.push(`vocabulary ${vocab.id} missing inherited required field ${field}`);
    }
  }
  return errors;
}

export function requiredOperationEventsFor(app, contracts = coreTierContracts) {
  return (app.vocabulary ?? []).flatMap((vocab) => {
    const inherited = bloomContract(vocab.extends, contracts);
    return (inherited?.chain ?? []).flatMap((contract) => (contract.requiredOperationEvents ?? []).map((operation) => ({
      vocabularyId: vocab.id,
      operation: `${vocab.id}.${operation}`,
      sourceContract: contract.id,
    })));
  });
}

function unique(values) {
  return [...new Set(values)];
}
