import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class FileQueue {
  constructor({ root }) {
    this.root = join(root, ".rta", "queue");
    mkdirSync(this.root, { recursive: true });
  }

  enqueue({ scenario, input = {}, review = false, high = false }) {
    const id = `job-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const job = {
      id,
      scenario,
      input,
      review,
      high,
      status: "queued",
      createdAt: new Date().toISOString(),
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
