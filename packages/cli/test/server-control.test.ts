import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  readServerState,
  removeServerState,
  writeServerState,
} from "../src/server-control.js"

describe("server control state", () => {
  it("writes, reads, and removes the shared server state file", async () => {
    const root = await mkdtemp(join(tmpdir(), "rta-server-control-"))
    await writeServerState({
      pid: 12345,
      startedAt: "2026-06-08T00:00:00.000Z",
      root,
      port: 5173,
      apiPort: 5174,
      runtimeSessionDir: join(root, ".rta-runtime", "sessions", "test"),
      argv: ["node", "rta.js", "serve", "--root", root],
      projects: [
        {
          name: "rta",
          vocabRoot: root,
          apiPort: 5174,
          catalogUrl: "http://localhost:5174/catalog",
          apiUrl: "http://localhost:5174/api/v1/catalog",
        },
      ],
    })

    await expect(readServerState(root)).resolves.toMatchObject({
      root,
      port: 5173,
      apiPort: 5174,
      projects: [
        {
          name: "rta",
          catalogUrl: "http://localhost:5174/catalog",
        },
      ],
    })

    await removeServerState(root)

    await expect(readServerState(root)).resolves.toBeNull()
  })
})
