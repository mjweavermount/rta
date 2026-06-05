import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class ReviewQueue {
  constructor({ root }) {
    this.root = join(root, ".rta", "reviews");
    mkdirSync(this.root, { recursive: true });
  }

  create({ runId, title, artifactPath, summary }) {
    const id = `review-${runId}`;
    const item = {
      id,
      runId,
      title,
      artifactPath,
      summary,
      status: "pending",
      actor: null,
      decidedAt: null,
      audit: [
        {
          at: new Date().toISOString(),
          actor: "system",
          action: "created",
        },
      ],
    };
    this.write(item);
    return item;
  }

  show(id) {
    return JSON.parse(readFileSync(join(this.root, `${id}.json`), "utf8"));
  }

  decide(id, { status, actor }) {
    const item = this.show(id);
    const updated = {
      ...item,
      status,
      actor,
      decidedAt: new Date().toISOString(),
      audit: [
        ...(item.audit ?? []),
        {
          at: new Date().toISOString(),
          actor,
          action: status,
        },
      ],
    };
    this.write(updated);
    return updated;
  }

  write(item) {
    writeFileSync(join(this.root, `${item.id}.json`), JSON.stringify(item, null, 2));
  }
}
