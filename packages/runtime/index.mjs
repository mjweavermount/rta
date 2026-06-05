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
