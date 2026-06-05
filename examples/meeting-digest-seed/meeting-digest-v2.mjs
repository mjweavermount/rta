const touchstones = ["RTA", "AFFiNE", "Plane", "Otter", "home lab", "Grafana"];

export function digestTranscriptV2(text) {
  const utterances = text
    .split("\n")
    .map(parseUtterance)
    .filter((u) => u.text.length > 0);

  const accumulator = new TopicAccumulator();
  for (const utterance of utterances) accumulator.add(utterance);
  const topics = accumulator.topics();
  const tasks = topics.flatMap(extractTasks);

  return {
    version: "v2",
    topics,
    tasks,
    provenance: {
      utteranceCount: utterances.length,
      topicCount: topics.length,
      taskCount: tasks.length,
      strategy: "keyword topic accumulator with loopback merge",
    },
  };
}

class TopicAccumulator {
  constructor() {
    this.items = [];
    this.lastKey = null;
  }

  add(utterance) {
    const key = topicKey(utterance.text, this.lastKey);
    const existing = this.items.find((topic) => topic.key === key);
    const target = existing ?? {
      id: `topic-${this.items.length + 1}`,
      key,
      title: topicTitle(key),
      speakers: new Set(),
      salientBullets: [],
      touchstones: new Set(),
    };
    target.speakers.add(utterance.speaker);
    target.salientBullets.push(utterance.text);
    for (const touchstone of touchstones) {
      if (utterance.text.toLowerCase().includes(touchstone.toLowerCase())) target.touchstones.add(touchstone);
    }
    if (!existing) this.items.push(target);
    this.lastKey = key;
  }

  topics() {
    return this.items.map((topic) => ({
      id: topic.id,
      title: topic.title,
      speakers: [...topic.speakers],
      touchstones: [...topic.touchstones],
      salientBullets: topic.salientBullets,
    }));
  }
}

function parseUtterance(line) {
  const match = line.match(/^([^:]+):\s*(.+)$/);
  return match ? { speaker: match[1], text: match[2] } : { speaker: "Unknown", text: line.trim() };
}

function topicKey(text, lastKey) {
  const lower = text.toLowerCase();
  if (lower.includes("log")) return "logging";
  if (lower.includes("review") || lower.includes("publish") || lower.includes("publication") || lower.includes("affine") || lower.includes("plane")) return "review-publication";
  if (lower.includes("meeting") || lower.includes("topic") || lower.includes("otter") || lower.includes("transcript")) return "meeting-digest";
  if (lower.includes("cli") || lower.includes("ledger") || lower.includes("vocab") || lower.includes("rta")) return "rta-authoring";
  if (/\b(then|exactly|also|right|yes|and)\b/i.test(text) && lastKey) return lastKey;
  return "general";
}

function topicTitle(key) {
  return {
    "rta-authoring": "RTA authoring platform",
    "meeting-digest": "Meeting digest workflow",
    logging: "Logging ceremony and run visibility",
    "review-publication": "Review gates and publication adapters",
    general: "General discussion",
  }[key];
}

function extractTasks(topic) {
  return topic.salientBullets
    .filter((line) => /\b(need|should|want|generate|run|create|build|publish|adapter|logs|review|dry-run)\b/i.test(line))
    .map((line, index) => ({
      id: `${topic.id}-task-${index + 1}`,
      title: taskTitle(line),
      goal: line,
      user: inferUser(topic),
      systems: topic.touchstones.length > 0 ? topic.touchstones : ["RTA"],
      talksTo: inferTalksTo(line),
      largerSystem: topic.title,
      classification: classify(line),
      sourceTopic: topic.id,
      confidence: confidence(line),
    }));
}

function inferUser(topic) {
  if (topic.title.includes("Meeting")) return "operator reviewing meeting output";
  if (topic.title.includes("Logging")) return "operator watching a run";
  return "RTA app author";
}

function inferTalksTo(line) {
  const lower = line.toLowerCase();
  const talksTo = [];
  if (lower.includes("affine")) talksTo.push("AFFiNE adapter");
  if (lower.includes("plane")) talksTo.push("Plane adapter");
  if (lower.includes("otter")) talksTo.push("Otter transcript source");
  if (lower.includes("home lab")) talksTo.push("home-lab hosting adapter");
  return talksTo;
}

function classify(line) {
  const lower = line.toLowerCase();
  if (lower.includes("figure out") || lower.includes("research")) return "research task";
  if (lower.includes("adapter") || lower.includes("publish") || lower.includes("publication") || lower.includes("generate") || lower.includes("dry-run")) return "automation capability";
  return "feature capability";
}

function confidence(line) {
  return /\b(exactly|should|need)\b/i.test(line) ? "high" : "medium";
}

function taskTitle(line) {
  return line.replace(/[.?!]$/g, "").split(/\s+/).slice(0, 10).join(" ");
}
