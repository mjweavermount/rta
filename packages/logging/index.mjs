import { redactSecrets } from "../security/index.mjs";

export class CeremonyLogger {
  constructor({ verbosity = "normal", sink = console.log, onEvent = null } = {}) {
    this.verbosity = verbosity;
    this.sink = sink;
    this.onEvent = onEvent;
    this.events = [];
  }

  step({ runId, actor = "system", step, input, output, parent = null, detail = null }) {
    const index = this.events.length + 1;
    const event = {
      type: "rta.step",
      at: new Date().toISOString(),
      index,
      runId,
      actor,
      step,
      input: redactSecrets(summarize(input)),
      output: redactSecrets(summarize(output)),
      parent,
      detail: shouldIncludeDetail(this.verbosity) ? redactSecrets(detail) : null,
    };
    this.events.push(event);
    this.onEvent?.(event);
    this.sink(formatHumanEvent(event, this.verbosity));
    return event;
  }
}

function summarize(value, depth = 0) {
  if (value == null) return null;
  if (typeof value === "string") return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 8)
        .map(([key, nested]) => [key, summarize(nested, depth + 1)]),
    );
  }
  return value;
}

function shouldIncludeDetail(verbosity) {
  return verbosity === "high" || verbosity === "trace";
}

function formatHumanEvent(event, verbosity) {
  const head = `[${event.runId}] #${event.index} ${event.step}`;
  const body = `actor=${event.actor} input=${JSON.stringify(event.input)} output=${JSON.stringify(event.output)}`;
  if (verbosity === "trace") {
    return [
      head,
      `  at=${event.at}`,
      `  ${body}`,
      `  parent=${JSON.stringify(event.parent)}`,
      `  detail=${JSON.stringify(event.detail)}`,
      `  event=${JSON.stringify({ type: event.type, runId: event.runId, step: event.step })}`,
    ].join("\n");
  }
  if (verbosity === "high" && event.detail) {
    return `${head}\n  ${body}\n  detail=${JSON.stringify(event.detail)}`;
  }
  return `${head} ${body}`;
}
