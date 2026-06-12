import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

export interface ServerProjectState {
  readonly name: string
  readonly vocabRoot: string
  readonly apiPort: number
  readonly catalogUrl: string
  readonly apiUrl: string
}

export interface ServerState {
  readonly pid: number
  readonly startedAt: string
  readonly root: string
  readonly port: number
  readonly apiPort: number
  readonly runtimeSessionDir: string
  readonly projects: readonly ServerProjectState[]
  readonly argv: readonly string[]
}

export interface ServerControlOptions {
  readonly root?: string
  readonly port?: number
  readonly apiPort?: number
}

const statePath = (root: string) => join(resolve(root), ".rta-runtime", "server.json")

const pidIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const listeningPids = (port: number): number[] => {
  const result = spawnSync("lsof", ["-tiTCP:" + String(port), "-sTCP:LISTEN"], {
    encoding: "utf8",
  })
  if (result.status !== 0 && result.stdout.trim() === "") return []
  return result.stdout
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0)
}

const waitForPidExit = async (pid: number, timeoutMs = 5_000): Promise<boolean> => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (!pidIsAlive(pid)) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return !pidIsAlive(pid)
}

const stopPids = async (pids: ReadonlyArray<number>): Promise<void> => {
  for (const pid of new Set(pids)) {
    if (pid === process.pid || !pidIsAlive(pid)) continue
    process.kill(pid, "SIGTERM")
  }
  for (const pid of new Set(pids)) {
    if (pid === process.pid) continue
    const exited = await waitForPidExit(pid)
    if (!exited && pidIsAlive(pid)) process.kill(pid, "SIGKILL")
  }
}

export const writeServerState = async (state: ServerState): Promise<void> => {
  const path = statePath(state.root)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(state, null, 2) + "\n", "utf8")
}

export const removeServerState = async (root: string): Promise<void> => {
  await unlink(statePath(root)).catch(() => undefined)
}

export const readServerState = async (root: string): Promise<ServerState | null> => {
  const path = statePath(root)
  if (!existsSync(path)) return null
  const raw = await readFile(path, "utf8")
  return JSON.parse(raw) as ServerState
}

const printMissing = (root: string) => {
  console.log(`No RTA server state found at ${statePath(root)}`)
  console.log("Start one with:")
  console.log("  npm run rta -- serve --root <generated-app-workspace>")
}

const printState = (state: ServerState, alive: boolean) => {
  console.log(`RTA server ${alive ? "running" : "stale"}`)
  console.log(`  pid      : ${state.pid}`)
  console.log(`  started  : ${state.startedAt}`)
  console.log(`  root     : ${state.root}`)
  console.log(`  runtime  : ${state.runtimeSessionDir}`)
  console.log(`  command  : ${state.argv.join(" ")}`)
  for (const project of state.projects) {
    console.log(`  ${project.name.padEnd(16)}: ${project.catalogUrl}`)
    console.log(`  ${"".padEnd(18)}api: ${project.apiUrl}`)
  }
}

const waitForServerState = async (
  root: string,
  pid: number | undefined,
  timeoutMs = 45_000,
): Promise<ServerState | null> => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const state = await readServerState(root)
    if (state && state.pid === pid && pidIsAlive(state.pid)) return state
    if (pid !== undefined && !pidIsAlive(pid)) return null
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

export const runServerStatus = async (opts: ServerControlOptions = {}): Promise<number> => {
  const root = resolve(opts.root ?? process.cwd())
  const state = await readServerState(root)
  if (!state) {
    printMissing(root)
    return 1
  }
  printState(state, pidIsAlive(state.pid))
  return pidIsAlive(state.pid) ? 0 : 2
}

export const runServerOpen = async (opts: ServerControlOptions = {}): Promise<number> => {
  const root = resolve(opts.root ?? process.cwd())
  const state = await readServerState(root)
  if (!state) {
    printMissing(root)
    return 1
  }
  const url = state.projects[0]?.catalogUrl ?? `http://localhost:${state.apiPort}/catalog`
  console.log(url)
  const opener = spawn("open", [url], { stdio: "ignore", detached: true })
  opener.unref()
  return 0
}

export const runServerStop = async (opts: ServerControlOptions = {}): Promise<number> => {
  const root = resolve(opts.root ?? process.cwd())
  const state = await readServerState(root)
  if (!state) {
    printMissing(root)
    return 1
  }
  if (!pidIsAlive(state.pid)) {
    console.log(`RTA server state is stale; removing ${statePath(root)}`)
    await removeServerState(root)
    return 0
  }
  process.kill(state.pid, "SIGTERM")
  console.log(`Stopping RTA server pid ${state.pid}`)
  return 0
}

export const runServerRestart = async (opts: ServerControlOptions = {}): Promise<number> => {
  const root = resolve(opts.root ?? process.cwd())
  const state = await readServerState(root)
  const nextApiPort = opts.apiPort ?? state?.apiPort
  if (state && pidIsAlive(state.pid)) {
    process.kill(state.pid, "SIGTERM")
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (nextApiPort !== undefined) {
    const stalePids = listeningPids(nextApiPort).filter((pid) => state === null || pid !== state.pid)
    if (stalePids.length > 0) {
      console.log(`Stopping stale RTA listener(s) on api port ${nextApiPort}: ${stalePids.join(", ")}`)
      await stopPids(stalePids)
    }
  }

  const args = [
    process.argv[1] ?? "rta",
    "serve",
    "--root",
    root,
    ...(opts.port !== undefined ? ["--port", String(opts.port)] : state ? ["--port", String(state.port)] : []),
    ...(opts.apiPort !== undefined ? ["--api-port", String(opts.apiPort)] : state ? ["--api-port", String(state.apiPort)] : []),
  ]
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: true,
    stdio: "ignore",
  })
  child.unref()
  const nextState = await waitForServerState(root, child.pid)
  if (!nextState) {
    console.error(`Started RTA server pid ${child.pid}, but it did not become ready before the timeout.`)
    console.error("Run `npm run rta -- serve --root <generated-app-workspace>` in the foreground to inspect startup errors.")
    return 1
  }

  printState(nextState, true)
  return 0
}
