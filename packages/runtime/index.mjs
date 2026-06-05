import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class FileRuntime {
  constructor({ root, runId }) {
    this.root = root;
    this.runId = runId;
    this.runRoot = join(root, ".rta", "runs", runId);
    mkdirSync(this.runRoot, { recursive: true });
    mkdirSync(join(this.runRoot, "artifacts"), { recursive: true });
    this.state = { runId, status: "running", artifacts: [], reviews: [], unitOfWorks: [] };
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
      unitOfWork: event.unitOfWork,
    });
    this.provenance.edges.push({
      from: event.parent ?? this.runId,
      to: id,
      type: "step",
    });
    this.saveArtifactRaw("provenance.json", this.provenance);
  }

  async operation({ logger, name, actor = "system", input, detail = null, parent = null, run }) {
    const unitOfWork = `${name}-${this.state.unitOfWorks.length + 1}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
    this.state.unitOfWorks.push({ id: unitOfWork, name, status: "running", parent, startedAt: nowIso() });
    this.saveState();
    logger.step({
      runId: this.runId,
      actor,
      step: `${name}.start`,
      input,
      output: "starting",
      parent,
      unitOfWork,
      detail,
    });
    try {
      const output = await run();
      this.updateUnitOfWork(unitOfWork, { status: "completed", completedAt: nowIso() });
      logger.step({
        runId: this.runId,
        actor,
        step: `${name}.complete`,
        input,
        output,
        parent,
        unitOfWork,
        detail,
      });
      return output;
    } catch (error) {
      this.updateUnitOfWork(unitOfWork, { status: "failed", completedAt: nowIso(), error: error.message });
      logger.step({
        runId: this.runId,
        actor,
        step: `${name}.failed`,
        input,
        output: error.message,
        parent,
        unitOfWork,
        detail: { ...detail, name: error.name, stack: error.stack },
      });
      throw error;
    }
  }

  updateUnitOfWork(id, patch) {
    this.state.unitOfWorks = this.state.unitOfWorks.map((item) => item.id === id ? { ...item, ...patch } : item);
    this.saveState();
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
  return `${prefix}-${nowIso().replace(/[:.]/g, "-")}`;
}

function nowIso() {
  return process.env.RTA_NOW || new Date().toISOString();
}
