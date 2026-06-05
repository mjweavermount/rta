import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class FileQueue {
  constructor({ root }) {
    this.root = join(root, ".rta", "queue");
    mkdirSync(this.root, { recursive: true });
  }

  enqueue({ scenario, input = {}, review = false, verbosity = "normal", high = false }) {
    const id = `job-${nowIso().replace(/[:.]/g, "-")}`;
    const job = {
      id,
      scenario,
      input,
      review,
      verbosity,
      high,
      status: "queued",
      createdAt: nowIso(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    };
    this.write(job);
    return job;
  }

  list() {
    return readdirSync(this.root)
      .filter((name) => name.endsWith(".json"))
      .map((name) => this.read(name.replace(/\.json$/, "")))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  next() {
    return this.list().find((job) => job.status === "queued") ?? null;
  }

  read(id) {
    return JSON.parse(readFileSync(join(this.root, `${id}.json`), "utf8"));
  }

  update(id, patch) {
    const job = { ...this.read(id), ...patch };
    this.write(job);
    return job;
  }

  write(job) {
    writeFileSync(join(this.root, `${job.id}.json`), JSON.stringify(job, null, 2));
  }
}

function nowIso() {
  return process.env.RTA_NOW || new Date().toISOString();
}
