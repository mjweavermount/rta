const taskSignals = [
  "need",
  "should",
  "want",
  "generate",
  "run",
  "create",
  "build",
  "publish",
  "adapter",
  "logs",
  "review",
];

export function digestTranscriptV1(text) {
  const blocks = text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const topics = blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const title = inferTitle(lines.join(" "), index);
    return {
      id: `topic-${index + 1}`,
      title,
      salientBullets: lines.map((line) => line.replace(/^[^:]+:\s*/, "")),
    };
  });

  const tasks = topics.flatMap((topic) =>
    topic.salientBullets
      .filter((line) => taskSignals.some((signal) => line.toLowerCase().includes(signal)))
      .map((line, index) => ({
        id: `${topic.id}-task-${index + 1}`,
        title: lineToTitle(line),
        goal: line,
        user: "RTA app author or operator",
        systems: inferSystems(line),
        largerSystem: line.toLowerCase().includes("meeting") ? "meeting digest proving app" : "RTA platform",
        kind: inferKind(line),
        confidence: "medium",
        sourceTopic: topic.id,
      }))
  );

  return { version: "v1", topics, tasks };
}

function inferTitle(text, index) {
  const lower = text.toLowerCase();
  if (lower.includes("ledger") || lower.includes("cli")) return "RTA authoring CLI and work ledger";
  if (lower.includes("topic") || lower.includes("otter")) return "Meeting digest topic segmentation";
  if (lower.includes("logs")) return "Human-readable operation logging";
  if (lower.includes("review") || lower.includes("publication")) return "Review gate and publication adapters";
  return `Meeting topic ${index + 1}`;
}

function inferSystems(line) {
  const systems = [];
  for (const name of ["RTA", "AFFiNE", "Plane", "Otter", "home lab"]) {
    if (line.toLowerCase().includes(name.toLowerCase())) systems.push(name);
  }
  return systems.length > 0 ? systems : ["RTA"];
}

function inferKind(line) {
  const lower = line.toLowerCase();
  if (lower.includes("research") || lower.includes("figure out")) return "research";
  if (lower.includes("adapter") || lower.includes("publish") || lower.includes("generate")) return "automation";
  return "feature";
}

function lineToTitle(line) {
  return line
    .replace(/[.?!]$/g, "")
    .split(/\s+/)
    .slice(0, 9)
    .join(" ");
}
