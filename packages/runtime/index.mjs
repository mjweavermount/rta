import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class FileRuntime {
  constructor({ root, runId }) {
    this.root = root;
    this.runId = runId;
    this.runRoot = join(root, ".rta", "runs", runId);
    mkdirSync(this.runRoot, { recursive: true });
    mkdirSync(join(this.runRoot, "artifacts"), { recursive: true });
    this.state = { runId, status: "running", artifacts: [], reviews: [] };
    this.provenance = { nodes: [{ id: runId, type: "run" }], edges: [] };
    this.saveState();
  }

  recordStep(event) {
    const id = `${event.step}-${this.provenance.nodes.length}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
    this.provenance.nodes.push({
      id,
      type: "step",
      step: event.step,
      at: event.at,
      actor: event.actor,
    });
    this.provenance.edges.push({
      from: event.parent ?? this.runId,
      to: id,
      type: "step",
    });
    this.saveArtifactRaw("provenance.json", this.provenance);
  }

  async operation({ logger, name, actor = "system", input, detail = null, parent = null, run }) {
    logger.step({
      runId: this.runId,
      actor,
      step: `${name}.start`,
      input,
      output: "starting",
      parent,
      detail,
    });
    try {
      const output = await run();
      logger.step({
        runId: this.runId,
        actor,
        step: `${name}.complete`,
        input,
        output,
        parent,
        detail,
      });
      return output;
    } catch (error) {
      logger.step({
        runId: this.runId,
        actor,
        step: `${name}.failed`,
        input,
        output: error.message,
        parent,
        detail: { ...detail, name: error.name, stack: error.stack },
      });
      throw error;
    }
  }

  saveArtifact(name, data) {
    const path = join(this.runRoot, "artifacts", name);
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    writeFileSync(path, content);
    this.state.artifacts.push({ name, path });
    this.provenance.nodes.push({ id: name, type: "artifact", path });
    this.provenance.edges.push({ from: this.runId, to: name, type: "produced" });
    this.saveArtifactRaw("provenance.json", this.provenance);
    this.saveState();
    return path;
  }

  saveArtifactRaw(name, data) {
    const path = join(this.runRoot, "artifacts", name);
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    writeFileSync(path, content);
    return path;
  }

  saveState(patch = {}) {
    this.state = { ...this.state, ...patch };
    writeFileSync(join(this.runRoot, "state.json"), JSON.stringify(this.state, null, 2));
  }

  loadState() {
    return JSON.parse(readFileSync(join(this.runRoot, "state.json"), "utf8"));
  }
}

export function createRunId(prefix = "run") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}
