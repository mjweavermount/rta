export function explainMeetingDigestObligation() {
  return [
    {
      tier: "T1 primitive",
      item: "ObservableRun",
      obligation: "Every app run must produce structured and human-readable logs.",
    },
    {
      tier: "T2 pattern",
      item: "ReviewGate",
      obligation: "Outputs that affect external systems must enter review before publication.",
    },
    {
      tier: "T3 archetype",
      item: "JobProcessor",
      obligation: "Bulk and streaming jobs share runtime ports and artifact handling.",
    },
    {
      tier: "App extension",
      item: "MeetingDigest",
      obligation: "Transcript topics produce review-ready digest and extracted work items.",
    },
  ];
}

export function buildDerivationGraph(app) {
  const nodes = [
    { id: app.name, type: "app" },
    ...(app.vocabulary ?? []).map((item) => ({ id: item.id, type: "vocabulary", extends: item.extends })),
    ...(app.useCases ?? []).map((item) => ({ id: item.id, type: "use-case" })),
    ...(app.scenarios ?? []).map((item) => ({ id: item.id, type: "scenario" })),
    { id: "ReviewBeforePublication", type: "obligation" },
    { id: "HumanReadableLogs", type: "obligation" },
    { id: "ScenarioBoundaryCoverage", type: "obligation" },
  ];

  const edges = [];
  for (const item of app.vocabulary ?? []) edges.push({ from: item.extends, to: item.id, type: "concretizes" });
  for (const useCase of app.useCases ?? []) {
    edges.push({ from: app.name, to: useCase.id, type: "declares-use-case" });
    for (const scenario of useCase.scenarios ?? []) edges.push({ from: useCase.id, to: scenario, type: "covered-by" });
  }
  for (const scenario of app.scenarios ?? []) edges.push({ from: scenario.id, to: "ScenarioBoundaryCoverage", type: "proves" });
  edges.push({ from: app.name, to: "ReviewBeforePublication", type: "requires" });
  edges.push({ from: app.name, to: "HumanReadableLogs", type: "requires" });

  return { nodes, edges };
}
