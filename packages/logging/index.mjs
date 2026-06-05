export class CeremonyLogger {
  constructor({ verbosity = "normal", sink = console.log } = {}) {
    this.verbosity = verbosity;
    this.sink = sink;
    this.events = [];
  }

  step({ runId, actor = "system", step, input, output, parent = null, detail = null }) {
    const event = {
      type: "rta.step",
      at: new Date().toISOString(),
      runId,
      actor,
      step,
      input: summarize(input),
      output: summarize(output),
      parent,
      detail: this.verbosity === "high" ? detail : null,
    };
    this.events.push(event);
    this.sink(formatHumanEvent(event, this.verbosity));
    return event;
  }
}

function summarize(value) {
  if (value == null) return null;
  if (typeof value === "string") return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 8));
  return value;
}

function formatHumanEvent(event, verbosity) {
  const head = `[${event.runId}] ${event.step}`;
  const body = `actor=${event.actor} input=${JSON.stringify(event.input)} output=${JSON.stringify(event.output)}`;
  if (verbosity === "high" && event.detail) {
    return `${head}\n  ${body}\n  detail=${JSON.stringify(event.detail)}`;
  }
  return `${head} ${body}`;
}
