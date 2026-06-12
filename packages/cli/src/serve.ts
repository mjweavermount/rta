import { Effect } from "effect"
import { spawn } from "node:child_process"
import { resolve, join, basename } from "node:path"
import { existsSync } from "node:fs"
import { readdir, writeFile, mkdir, unlink, appendFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { readVocabFile } from "@rta/vocab"
import type { BoundedContextDeclaration, ConnectionsDeclaration } from "@rta/vocab"
import { generateRegistry } from "./generate/registry-generator.js"
import { generateContext } from "./generate/context-generator.js"
import { buildCatalog } from "./catalog.js"
import { catalogHtml } from "./catalog-html.js"
import { isGoldenFixturePath } from "./discovery.js"
import { removeServerState, writeServerState } from "./server-control.js"

export interface ServeOptions {
  root?: string
  roots?: string[]
  port?: number
  apiPort?: number
}

interface ProjectSpec {
  name: string
  vocabRoot: string
  apiPort: number
}

function resolveEsbuild(distDir: string): string {
  const candidates = [
    join(distDir, "..", "node_modules", ".bin", "esbuild"),
    join(distDir, "..", "..", "..", "node_modules", ".bin", "esbuild"),
    join(distDir, "..", "..", "node_modules", ".bin", "esbuild"),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return "esbuild"
}

// ---------------------------------------------------------------------------
// API server template — written into registryDir alongside registry.ts
// so relative imports resolve, then esbuild bundles everything together.
// ---------------------------------------------------------------------------

const buildApiEntryContent = (
  apiPort: number,
  vocabRoot: string,
  catalogSnapshotPath: string,
): string => `
import { createServer } from "node:http"
import { readdirSync, readFileSync } from "node:fs"
import { readdir, readFile, appendFile, mkdir } from "node:fs/promises"
import { spawn } from "node:child_process"
import {
  extname as pathExtname,
  join as pathJoin,
  relative as pathRelative,
  resolve as pathResolve,
} from "node:path"
import { parse as parseYaml } from "yaml"
import { Effect, ManagedRuntime, Tracer, Layer, Option } from "effect"
import { makeRootContext, ConnectionMap, startReadableLogSink } from "@rta/strict"
import { registry, stores } from "./registry.js"

const PORT = ${apiPort}
const VOCAB_ROOT = ${JSON.stringify(vocabRoot)}
const CATALOG_SNAPSHOT_PATH = ${JSON.stringify(catalogSnapshotPath)}
const TRACE_LOG_MAX = 100
const RUNTIME_SESSION_DIR = process.env["RTA_RUNTIME_SESSION_DIR"] ?? null
const RUNTIME_PROJECT_NAME = process.env["RTA_RUNTIME_PROJECT_NAME"] ?? "unknown-project"

// ---------------------------------------------------------------------------
// Execution trace log — ring-buffer of the last TRACE_LOG_MAX executions
// ---------------------------------------------------------------------------

const traceLog = []
const sseClients = new Set()

// ---------------------------------------------------------------------------
// OTel-style span store — custom Effect Tracer writes here
// ---------------------------------------------------------------------------

const spanStore = []
const SPAN_STORE_MAX = 1000

function randomHex(len) {
  let out = ""
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 16).toString(16)
  return out
}

function makeRtaSpan(name, parentSpan, startTime) {
  const spanId = randomHex(16)
  const traceId = parentSpan && parentSpan._tag === "Span" ? parentSpan.traceId : randomHex(32)
  const attributes = new Map()
  let spanStatus = { _tag: "Unset" }
  let startMs = Number(startTime) / 1_000_000

  const span = {
    _tag: "Span",
    spanId,
    traceId,
    name,
    sampled: true,
    attributes,
    get status() { return spanStatus },
    parent: parentSpan ? Option.some(parentSpan) : Option.none(),
    context: {},
    links: [],
    startTime,
    end(endTime, exit) {
      const endMs = Number(endTime) / 1_000_000
      const attrs = {}
      for (const [k, v] of attributes) attrs[k] = typeof v === "bigint" ? String(v) : v
      spanStore.unshift({
        spanId,
        traceId,
        parentSpanId: parentSpan && parentSpan._tag === "Span" ? parentSpan.spanId : null,
        name,
        attributes: attrs,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        status: exit._tag === "Failure" ? "error" : "ok",
      })
      if (spanStore.length > SPAN_STORE_MAX) spanStore.length = SPAN_STORE_MAX
    },
    attribute(key, value) { attributes.set(key, value) },
    event() {},
  }
  return span
}

const rtaTracer = Tracer.make({
  span(name, parent, _context, _links, startTime) {
    const parentSpan = Option.isSome(parent) ? parent.value : undefined
    const resolvedStart = Option.isSome(startTime)
      ? startTime.value
      : BigInt(Date.now()) * BigInt(1_000_000)
    return makeRtaSpan(name, parentSpan, resolvedStart)
  },
})

const rtaTracerLayer = Layer.succeed(Tracer.Tracer, rtaTracer)

// Per-context ManagedRuntime cache — keeps layer state (InMemory stores) alive across requests
const runtimeCache = {}
for (const [key, entry] of Object.entries(registry)) {
  const ctx = key.split('.')[0]
  if (!runtimeCache[ctx]) runtimeCache[ctx] = ManagedRuntime.make(Layer.merge(entry.layer, rtaTracerLayer))
}

function appendTrace(entry) {
  traceLog.unshift(entry)
  if (traceLog.length > TRACE_LOG_MAX) traceLog.length = TRACE_LOG_MAX
  const msg = "data: " + JSON.stringify(entry) + "\\n\\n"
  for (const client of [...sseClients]) {
    try { client.write(msg) } catch { sseClients.delete(client) }
  }
}

if (RUNTIME_SESSION_DIR) {
  void mkdir(RUNTIME_SESSION_DIR, { recursive: true })
  const runtimeEventsPath = pathJoin(RUNTIME_SESSION_DIR, "events.ndjson")
  const runtimeLogPath = pathJoin(RUNTIME_SESSION_DIR, "readable.log")
  startReadableLogSink((entry) => {
    const record = {
      project: RUNTIME_PROJECT_NAME,
      capturedAt: new Date().toISOString(),
      line: entry.line,
      event: entry.event,
    }
    void appendFile(runtimeEventsPath, JSON.stringify(record) + "\\n", "utf8")
    void appendFile(runtimeLogPath, "[" + RUNTIME_PROJECT_NAME + "] " + entry.line + "\\n", "utf8")
  })
}

function serializeError(err) {
  if (err && typeof err === "object") {
    try {
      return JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)))
    } catch {
      return String(err)
    }
  }
  return String(err)
}

function languageForPath(path) {
  switch (pathExtname(path)) {
    case ".ts": return "ts"
    case ".tsx": return "tsx"
    case ".js":
    case ".mjs":
    case ".cjs": return "js"
    case ".jsx": return "jsx"
    case ".json": return "json"
    case ".yaml":
    case ".yml": return "yaml"
    case ".md": return "md"
    default: return "text"
  }
}

function safeRelativePath(root, requestedPath) {
  const resolvedRoot = pathResolve(root)
  const resolvedPath = pathResolve(resolvedRoot, requestedPath)
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + "/")) {
    throw new Error("Path escapes catalog root: " + requestedPath)
  }
  return pathRelative(resolvedRoot, resolvedPath)
}

function readCatalogSnapshot() {
  return JSON.parse(readFileSync(CATALOG_SNAPSHOT_PATH, "utf8"))
}

function readCatalogSource(requestedPath, range = {}) {
  const rel = safeRelativePath(VOCAB_ROOT, requestedPath)
  const absolutePath = pathResolve(VOCAB_ROOT, rel)
  const text = readFileSync(absolutePath, "utf8")
  const allLines = text.split(/\\r?\\n/)
  const start = Math.max(1, Number(range.start ?? 1) || 1)
  const end = Math.min(allLines.length, Number(range.end ?? allLines.length) || allLines.length)
  const lines = allLines.slice(start - 1, end).map((line, idx) => ({
    number: start + idx,
    text: line,
  }))
  return {
    path: rel,
    language: languageForPath(rel),
    text: lines.map((line) => line.text).join("\\n"),
    lines,
  }
}

function termAliases(node) {
  const aliases = [node.name, node.id]
  if (node.kind === "pattern" && node.id.startsWith("pattern.")) {
    aliases.push(node.id.slice("pattern.".length))
  }
  if (node.kind === "ard") aliases.push(node.id)
  if (node.kind === "concept") aliases.push(String(node.metadata?.term ?? node.name))
  return [...new Set(aliases.filter((alias) => alias.length >= 3))]
}

function isIdentifierChar(value) {
  return value !== undefined && /[A-Za-z0-9_.:-]/.test(value)
}

function sourceLinksForText(source, nodes) {
  const aliases = nodes.flatMap((node) =>
    termAliases(node).map((alias) => ({ alias, targetId: node.id })),
  ).sort((a, b) => b.alias.length - a.alias.length)
  const links = []

  for (const line of source.lines) {
    const claimed = []
    for (const { alias, targetId } of aliases) {
      let index = line.text.indexOf(alias)
      while (index >= 0) {
        const start = index
        const end = index + alias.length
        const overlaps = claimed.some(([a, b]) => start < b && end > a)
        const hasWordBoundary =
          !isIdentifierChar(line.text[start - 1]) &&
          !isIdentifierChar(line.text[end])
        if (!overlaps && hasWordBoundary) {
          claimed.push([start, end])
          links.push({
            line: line.number,
            startColumn: start + 1,
            endColumn: end + 1,
            text: alias,
            targetKind: "catalog-node",
            targetId,
          })
        }
        index = line.text.indexOf(alias, index + alias.length)
      }
    }
  }

  return links.sort((a, b) => a.line - b.line || a.startColumn - b.startColumn)
}

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // SSE endpoint — must be handled before Content-Type: application/json is set
  if (req.method === "GET" && req.url === "/traces/stream") {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.writeHead(200)
    res.write("data: connected\\n\\n")
    sseClients.add(res)
    req.on("close", () => sseClients.delete(res))
    return
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/catalog")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.writeHead(200)
    res.end(${JSON.stringify(catalogHtml)})
    return
  }

  res.setHeader("Content-Type", "application/json")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "GET" && req.url === "/registry") {
    const entries = Object.entries(registry).map(([key, e]) => ({
      key,
      kind: e.kind,
    }))
    res.writeHead(200)
    res.end(JSON.stringify({ registry: entries }))
    return
  }

  if (req.method === "GET" && req.url === "/traces") {
    res.writeHead(200)
    res.end(JSON.stringify({ traces: traceLog }))
    return
  }

  if (req.method === "DELETE" && req.url === "/traces") {
    traceLog.length = 0
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "POST" && req.url === "/execute") {
    let body = ""
    req.on("data", (chunk) => { body += chunk.toString() })
    req.on("end", () => {
      let key, payload
      try {
        const parsed = JSON.parse(body)
        key = parsed.key
        payload = parsed.payload
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ error: "Invalid JSON body" }))
        return
      }

      const entry = registry[key]
      if (!entry) {
        res.writeHead(404)
        res.end(JSON.stringify({ error: "Unknown key: " + key }))
        return
      }

      // Capture events published during this execution (commands only).
      const capturedEvents = []
      const startMs = Date.now()

      // Both strict commands and queries require a root context (correlationId, issuedBy).
      const rootCtx = makeRootContext("rta-serve")
      const baseProgram = Effect.gen(function* () {
        const msg = yield* entry.make(payload ?? {}, rootCtx)
        return yield* entry.handle(msg)
      })

      // For commands, wrap ConnectionMap with an onPublish hook before running.
      const ctx = key.split('.')[0]
      const rt = runtimeCache[ctx] ?? ManagedRuntime.make(entry.layer)
      const program = entry.kind === "command"
        ? baseProgram.pipe(
            Effect.updateService(ConnectionMap, (original) => ({
              canPublish: original.canPublish.bind(original),
              canSubscribe: original.canSubscribe.bind(original),
              onPublish(event, sourceContext, targetContext) {
                capturedEvents.push({
                  tag: event._tag,
                  payload: event.payload ?? null,
                  aggregateId: event.aggregateId ?? null,
                  aggregateType: event.aggregateType ?? null,
                  correlationId: event.correlationId ?? null,
                  causationId: event.causationId ?? null,
                  sourceContext,
                  targetContext,
                  timestamp: new Date().toISOString(),
                })
              },
            })),
          )
        : baseProgram

      const executeWithCascade = async () => {
        const result = await rt.runPromise(Effect.either(program))
        const durationMs = Date.now() - startMs

        if (result._tag === "Left") {
          return { ok: false, result: null, error: serializeError(result.left), events: capturedEvents, durationMs }
        }

        // Cascade: dispatch each captured event to registered handlers (max depth 2)
        const dispatchQueue = capturedEvents.map(e => ({ ...e, _depth: 0 }))
        let qi = 0
        while (qi < dispatchQueue.length) {
          const evt = dispatchQueue[qi++]
          if ((evt._depth ?? 0) >= 2) continue
          const handlerKey = evt.targetContext + ".on:" + evt.tag
          const handlerEntry = registry[handlerKey]
          if (!handlerEntry || handlerEntry.kind !== "event") continue
          const handlerCaptured = []
          const handlerRt = runtimeCache[evt.targetContext] ?? ManagedRuntime.make(Layer.merge(handlerEntry.layer, rtaTracerLayer))
          const handlerProgram = handlerEntry.handle(evt).pipe(
            Effect.updateService(ConnectionMap, (original) => ({
              canPublish: original.canPublish.bind(original),
              canSubscribe: original.canSubscribe.bind(original),
              onPublish(event, sourceContext, targetContext) {
                handlerCaptured.push({
                  tag: event._tag,
                  payload: event.payload ?? null,
                  aggregateId: event.aggregateId ?? null,
                  aggregateType: event.aggregateType ?? null,
                  correlationId: event.correlationId ?? null,
                  causationId: event.causationId ?? null,
                  sourceContext,
                  targetContext,
                  timestamp: new Date().toISOString(),
                  _depth: (evt._depth ?? 0) + 1,
                })
              },
            }))
          )
          try {
            await handlerRt.runPromise(Effect.either(handlerProgram))
            capturedEvents.push(...handlerCaptured)
            dispatchQueue.push(...handlerCaptured)
          } catch (_e) {}
        }

        return { ok: true, result: result.right ?? null, error: null, events: capturedEvents, durationMs }
      }

      executeWithCascade()
        .then(({ ok, result, error, events, durationMs }) => {
          if (ok) {
            appendTrace({
              id: rootCtx.correlationId,
              key,
              kind: entry.kind,
              payload: payload ?? null,
              correlationId: rootCtx.correlationId,
              timestamp: rootCtx.issuedAt.toISOString(),
              durationMs,
              ok: true,
              result,
              error: null,
              events,
            })
            res.writeHead(200)
            res.end(JSON.stringify({ ok: true, result, events }))
          } else {
            appendTrace({
              id: rootCtx.correlationId,
              key,
              kind: entry.kind,
              payload: payload ?? null,
              correlationId: rootCtx.correlationId,
              timestamp: rootCtx.issuedAt.toISOString(),
              durationMs,
              ok: false,
              result: null,
              error,
              events,
            })
            res.writeHead(422)
            res.end(JSON.stringify({ ok: false, error, events }))
          }
        })
        .catch((err) => {
          const durationMs = Date.now() - startMs
          appendTrace({
            id: rootCtx.correlationId,
            key,
            kind: entry.kind,
            payload: payload ?? null,
            correlationId: rootCtx.correlationId,
            timestamp: rootCtx.issuedAt.toISOString(),
            durationMs,
            ok: false,
            result: null,
            error: String(err),
            events: [],
          })
          res.writeHead(500)
          res.end(JSON.stringify({ ok: false, error: String(err), events: [] }))
        })
    })
    return
  }

  if (req.method === "GET" && req.url === "/stores") {
    const result = {}
    for (const [key, map] of Object.entries(stores)) {
      result[key] = [...map.values()].map((v) => {
        try { return JSON.parse(JSON.stringify(v)) } catch { return String(v) }
      })
    }
    res.writeHead(200)
    res.end(JSON.stringify(result))
    return
  }

  if (req.method === "GET" && req.url?.startsWith("/spans")) {
    const urlObj = new URL(req.url, "http://localhost")
    const correlationId = urlObj.searchParams.get("correlationId")
    const result = correlationId
      ? spanStore.filter((s) => s.attributes["rta.correlation.id"] === correlationId)
      : spanStore.slice(0, 200)
    res.writeHead(200)
    res.end(JSON.stringify({ spans: result }))
    return
  }

  if (req.method === "GET" && req.url === "/check") {
    runChecks(VOCAB_ROOT)
      .then((results) => {
        res.writeHead(200)
        res.end(JSON.stringify(results))
      })
      .catch((err) => {
        res.writeHead(500)
        res.end(JSON.stringify({ error: String(err) }))
      })
    return
  }

  if (req.method === "GET" && req.url?.startsWith("/api/v1/catalog")) {
    try {
      const urlObj = new URL(req.url, "http://localhost")
      const catalog = readCatalogSnapshot()

      if (urlObj.pathname === "/api/v1/catalog") {
        res.writeHead(200)
        res.end(JSON.stringify(catalog))
        return
      }

      if (urlObj.pathname === "/api/v1/catalog/nodes") {
        res.writeHead(200)
        res.end(JSON.stringify({ nodes: catalog.nodes }))
        return
      }

      if (urlObj.pathname.startsWith("/api/v1/catalog/nodes/")) {
        const id = decodeURIComponent(urlObj.pathname.slice("/api/v1/catalog/nodes/".length))
        const node = catalog.nodes.find((n) => n.id === id)
        if (!node) {
          res.writeHead(404)
          res.end(JSON.stringify({ error: "Catalog node not found: " + id }))
          return
        }
        res.writeHead(200)
        res.end(JSON.stringify(node))
        return
      }

      if (urlObj.pathname === "/api/v1/catalog/edges") {
        res.writeHead(200)
        res.end(JSON.stringify({ edges: catalog.edges }))
        return
      }

      if (urlObj.pathname === "/api/v1/catalog/search") {
        const q = (urlObj.searchParams.get("q") ?? "").trim().toLowerCase()
        const nodes = q.length === 0
          ? []
          : catalog.nodes.filter((node) =>
              [node.id, node.name, node.description, node.path, node.kind]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q)),
            )
        res.writeHead(200)
        res.end(JSON.stringify({ query: q, nodes }))
        return
      }
    } catch (err) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: String(err) }))
      return
    }
  }

  if (req.method === "GET" && req.url?.startsWith("/api/v1/source")) {
    try {
      const urlObj = new URL(req.url, "http://localhost")
      const requestedPath = urlObj.searchParams.get("path")
      if (!requestedPath) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: "Missing required query parameter: path" }))
        return
      }

      const source = readCatalogSource(requestedPath, {
        start: urlObj.searchParams.get("start") ?? undefined,
        end: urlObj.searchParams.get("end") ?? undefined,
      })

      if (urlObj.pathname === "/api/v1/source/links") {
        const catalog = readCatalogSnapshot()
        res.writeHead(200)
        res.end(JSON.stringify({
          path: source.path,
          links: sourceLinksForText(source, catalog.nodes),
        }))
        return
      }

      if (urlObj.pathname === "/api/v1/source") {
        res.writeHead(200)
        res.end(JSON.stringify(source))
        return
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.writeHead(message.includes("escapes catalog root") ? 400 : 404)
      res.end(JSON.stringify({ error: message }))
      return
    }
  }

  // ---------------------------------------------------------------------------
  // Scenario endpoints
  // ---------------------------------------------------------------------------

  // GET /scenarios — list all captured test suites from .rta-captures/
  if (req.method === "GET" && req.url === "/scenarios") {
    const capturesDir = pathJoin(VOCAB_ROOT, ".rta-captures")
    ;(async () => {
      try {
        const files = await readdir(capturesDir).catch(() => [])
        const suites = []
        for (const f of files) {
          if (!f.endsWith(".json")) continue
          try {
            const raw = await readFile(pathJoin(capturesDir, f), "utf-8")
            suites.push(JSON.parse(raw))
          } catch { /* skip malformed */ }
        }
        res.writeHead(200)
        res.end(JSON.stringify(suites))
      } catch (err) {
        res.writeHead(500)
        res.end(JSON.stringify({ error: String(err) }))
      }
    })()
    return
  }

  // GET /scenarios/:slug — ScenarioCapture by slug (suite-name/test-name)
  if (req.method === "GET" && req.url?.startsWith("/scenarios/")) {
    const slug = req.url.slice("/scenarios/".length)
    const capturesDir = pathJoin(VOCAB_ROOT, ".rta-captures")
    readFile(pathJoin(capturesDir, slug + ".json"), "utf-8")
      .then((raw) => { res.writeHead(200); res.end(raw) })
      .catch(() => { res.writeHead(404); res.end(JSON.stringify({ error: "Not found: " + slug })) })
    return
  }

  // POST /scenarios/run — shell out to vitest, writes fresh captures
  if (req.method === "POST" && req.url === "/scenarios/run") {
    const capturesDir = pathJoin(VOCAB_ROOT, ".rta-captures")
    console.log("[scenarios] run: cwd=" + VOCAB_ROOT + " captures=" + capturesDir)
    const child = spawn("pnpm", ["run", "test"], {
      cwd: VOCAB_ROOT,
      env: { ...process.env, RTA_CAPTURES_DIR: capturesDir },
      stdio: "pipe",
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (d) => { process.stdout.write(d) ; stdout += d.toString() })
    child.stderr?.on("data", (d) => { process.stderr.write(d) ; stderr += d.toString() })
    child.on("close", (code) => {
      console.log("[scenarios] run finished: code=" + code)
      res.writeHead(code === 0 ? 200 : 500)
      res.end(JSON.stringify({ ok: code === 0, code, stdout, stderr }))
    })
    child.on("error", (err) => {
      console.error("[scenarios] spawn error:", err.message)
      res.writeHead(500)
      res.end(JSON.stringify({ ok: false, error: String(err) }))
    })
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: "Not found" }))
})

// ---------------------------------------------------------------------------
// ARD check helpers
// ---------------------------------------------------------------------------

function discoverArdFiles(root) {
  const results = []
  const walk = (dir) => {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== "node_modules") {
          walk(dir + "/" + entry.name)
        } else if (entry.name.endsWith(".ard.yaml")) {
          results.push(dir + "/" + entry.name)
        }
      }
    } catch {}
  }
  walk(root)
  return results
}

function runCommand(cmd, cwd) {
  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    const proc = spawn(cmd, [], { shell: true, cwd })
    proc.stdout?.on("data", (d) => { stdout += d.toString() })
    proc.stderr?.on("data", (d) => { stderr += d.toString() })
    proc.on("error", (e) => {
      resolve({ passed: false, exitCode: -1, stdout, stderr: stderr || e.message })
    })
    proc.on("close", (code) => {
      resolve({ passed: code === 0, exitCode: code ?? -1, stdout: stdout.trim(), stderr: stderr.trim() })
    })
  })
}

async function runChecks(root) {
  const ardFiles = discoverArdFiles(root)
  const results = []
  for (const filePath of ardFiles) {
    let raw
    try { raw = parseYaml(readFileSync(filePath, "utf-8")) } catch { continue }
    if (!raw || typeof raw !== "object" || !raw.id) continue
    const checkResults = []
    let ardPassed = true
    for (const check of raw.checks ?? []) {
      const r = await runCommand(check.command, root)
      if (!r.passed) ardPassed = false
      checkResults.push({
        description: check.description ?? "",
        command: check.command,
        passed: r.passed,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
      })
    }
    results.push({
      id: raw.id,
      name: raw.name ?? raw.id,
      severity: raw.severity ?? "error",
      description: raw.description ?? null,
      passed: ardPassed,
      checks: checkResults,
    })
  }
  results.sort((a, b) => a.id.localeCompare(b.id))
  return { ardsRan: results.length, results }
}

server.listen(PORT, () => {
  console.log("  API server : http://localhost:" + PORT)
})
`.trim()

const buildCatalogOnlyEntryContent = (
  apiPort: number,
  vocabRoot: string,
  catalogSnapshotPath: string,
  runtimeUnavailableReason: string,
): string => `
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import {
  extname as pathExtname,
  relative as pathRelative,
  resolve as pathResolve,
} from "node:path"

const PORT = ${apiPort}
const VOCAB_ROOT = ${JSON.stringify(vocabRoot)}
const CATALOG_SNAPSHOT_PATH = ${JSON.stringify(catalogSnapshotPath)}
const RUNTIME_UNAVAILABLE_REASON = ${JSON.stringify(runtimeUnavailableReason)}

function languageForPath(path) {
  switch (pathExtname(path)) {
    case ".ts": return "ts"
    case ".tsx": return "tsx"
    case ".js":
    case ".mjs":
    case ".cjs": return "js"
    case ".jsx": return "jsx"
    case ".json": return "json"
    case ".yaml":
    case ".yml": return "yaml"
    case ".md": return "md"
    default: return "text"
  }
}

function safeRelativePath(root, requestedPath) {
  const resolvedRoot = pathResolve(root)
  const resolvedPath = pathResolve(resolvedRoot, requestedPath)
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + "/")) {
    throw new Error("Path escapes catalog root: " + requestedPath)
  }
  return pathRelative(resolvedRoot, resolvedPath)
}

function readCatalogSnapshot() {
  return JSON.parse(readFileSync(CATALOG_SNAPSHOT_PATH, "utf8"))
}

function readCatalogSource(requestedPath, range = {}) {
  const rel = safeRelativePath(VOCAB_ROOT, requestedPath)
  const absolutePath = pathResolve(VOCAB_ROOT, rel)
  const text = readFileSync(absolutePath, "utf8")
  const allLines = text.split(/\\r?\\n/)
  const start = Math.max(1, Number(range.start ?? 1) || 1)
  const end = Math.min(allLines.length, Number(range.end ?? allLines.length) || allLines.length)
  const lines = allLines.slice(start - 1, end).map((line, idx) => ({
    number: start + idx,
    text: line,
  }))
  return {
    path: rel,
    language: languageForPath(rel),
    text: lines.map((line) => line.text).join("\\n"),
    lines,
  }
}

function termAliases(node) {
  const aliases = [node.name, node.id]
  if (node.kind === "pattern" && node.id.startsWith("pattern.")) {
    aliases.push(node.id.slice("pattern.".length))
  }
  if (node.kind === "ard") aliases.push(node.id)
  if (node.kind === "concept") aliases.push(String(node.metadata?.term ?? node.name))
  return [...new Set(aliases.filter((alias) => alias.length >= 3))]
}

function isIdentifierChar(value) {
  return value !== undefined && /[A-Za-z0-9_.:-]/.test(value)
}

function sourceLinksForText(source, nodes) {
  const aliases = nodes.flatMap((node) =>
    termAliases(node).map((alias) => ({ alias, targetId: node.id })),
  ).sort((a, b) => b.alias.length - a.alias.length)
  const links = []

  for (const line of source.lines) {
    const claimed = []
    for (const { alias, targetId } of aliases) {
      let index = line.text.indexOf(alias)
      while (index >= 0) {
        const start = index
        const end = index + alias.length
        const overlaps = claimed.some(([a, b]) => start < b && end > a)
        const hasWordBoundary =
          !isIdentifierChar(line.text[start - 1]) &&
          !isIdentifierChar(line.text[end])
        if (!overlaps && hasWordBoundary) {
          claimed.push([start, end])
          links.push({
            line: line.number,
            startColumn: start + 1,
            endColumn: end + 1,
            text: alias,
            targetKind: "catalog-node",
            targetId,
          })
        }
        index = line.text.indexOf(alias, index + alias.length)
      }
    }
  }

  return links.sort((a, b) => a.line - b.line || a.startColumn - b.startColumn)
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json")
  res.writeHead(status)
  res.end(JSON.stringify(body))
}

function routeCatalog(req, res) {
  if (req.method === "GET" && (req.url === "/" || req.url === "/catalog")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.writeHead(200)
    res.end(${JSON.stringify(catalogHtml)})
    return true
  }

  if (req.method === "GET" && req.url?.startsWith("/api/v1/catalog")) {
    try {
      const urlObj = new URL(req.url, "http://localhost")
      const catalog = readCatalogSnapshot()

      if (urlObj.pathname === "/api/v1/catalog") {
        sendJson(res, 200, catalog)
        return true
      }

      if (urlObj.pathname === "/api/v1/catalog/nodes") {
        sendJson(res, 200, { nodes: catalog.nodes })
        return true
      }

      if (urlObj.pathname.startsWith("/api/v1/catalog/nodes/")) {
        const id = decodeURIComponent(urlObj.pathname.slice("/api/v1/catalog/nodes/".length))
        const node = catalog.nodes.find((n) => n.id === id)
        sendJson(res, node ? 200 : 404, node ?? { error: "Catalog node not found: " + id })
        return true
      }

      if (urlObj.pathname === "/api/v1/catalog/edges") {
        sendJson(res, 200, { edges: catalog.edges })
        return true
      }

      if (urlObj.pathname === "/api/v1/catalog/search") {
        const q = (urlObj.searchParams.get("q") ?? "").trim().toLowerCase()
        const nodes = q.length === 0
          ? []
          : catalog.nodes.filter((node) =>
              [node.id, node.name, node.description, node.path, node.kind]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q)),
            )
        sendJson(res, 200, { query: q, nodes })
        return true
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err) })
      return true
    }
  }

  if (req.method === "GET" && req.url?.startsWith("/api/v1/source")) {
    try {
      const urlObj = new URL(req.url, "http://localhost")
      const requestedPath = urlObj.searchParams.get("path")
      if (!requestedPath) {
        sendJson(res, 400, { error: "Missing required query parameter: path" })
        return true
      }

      const source = readCatalogSource(requestedPath, {
        start: urlObj.searchParams.get("start") ?? undefined,
        end: urlObj.searchParams.get("end") ?? undefined,
      })

      if (urlObj.pathname === "/api/v1/source/links") {
        const catalog = readCatalogSnapshot()
        sendJson(res, 200, {
          path: source.path,
          links: sourceLinksForText(source, catalog.nodes),
        })
        return true
      }

      if (urlObj.pathname === "/api/v1/source") {
        sendJson(res, 200, source)
        return true
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendJson(res, message.includes("escapes catalog root") ? 400 : 404, { error: message })
      return true
    }
  }

  return false
}

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (routeCatalog(req, res)) return

  if (req.method === "GET" && req.url === "/registry") {
    sendJson(res, 503, { registry: [], runtimeUnavailableReason: RUNTIME_UNAVAILABLE_REASON })
    return
  }

  if (req.method === "GET" && (req.url === "/traces" || req.url === "/stores" || req.url === "/spans")) {
    sendJson(res, 503, { error: "Runtime server unavailable", runtimeUnavailableReason: RUNTIME_UNAVAILABLE_REASON })
    return
  }

  if (req.method === "POST" && req.url === "/execute") {
    sendJson(res, 503, { ok: false, error: "Runtime server unavailable", runtimeUnavailableReason: RUNTIME_UNAVAILABLE_REASON })
    return
  }

  sendJson(res, 404, { error: "Not found" })
})

server.listen(PORT, () => {
  console.log("  Catalog UI : http://localhost:" + PORT + "/catalog")
  console.log("  Catalog API: http://localhost:" + PORT + "/api/v1/catalog")
  console.log("  Runtime API: unavailable; catalog/source browsing is still available")
})
`.trim()

// ---------------------------------------------------------------------------
// Vocab discovery
// ---------------------------------------------------------------------------

const discoverFiles = async (root: string, suffix: string): Promise<string[]> => {
  try {
    const entries = await readdir(root, { recursive: true })
    return entries
      .filter((e) => e.endsWith(suffix) && !e.includes("node_modules"))
      .filter((e) => !isGoldenFixturePath(e))
      .filter((e) => !e.startsWith("packages/vocab/test/fixtures/"))
      .map((e) => join(root, e))
  } catch {
    return []
  }
}

const uniqueBy = <T>(
  values: ReadonlyArray<T>,
  keyOf: (value: T) => string,
): T[] => {
  const seen = new Set<string>()
  const unique: T[] = []

  for (const value of values) {
    const key = keyOf(value)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
  }

  return unique
}

interface RuntimeSessionInfo {
  readonly sessionId: string
  readonly sessionDir: string
}

const formatSessionId = (date: Date) =>
  date.toISOString().replaceAll(":", "-").replaceAll(".", "-")

const prepareRuntimeSession = async (
  root: string,
  projects: ReadonlyArray<ProjectSpec>,
): Promise<RuntimeSessionInfo> => {
  const runtimeRoot = join(root, ".rta-runtime", "sessions")
  await mkdir(runtimeRoot, { recursive: true })

  const sessionId = formatSessionId(new Date())
  const sessionDir = join(runtimeRoot, sessionId)
  await mkdir(sessionDir, { recursive: true })

  await writeFile(
    join(sessionDir, "session.json"),
    JSON.stringify({
      sessionId,
      startedAt: new Date().toISOString(),
      pid: process.pid,
      cwd: root,
      projects: projects.map((project) => ({
        name: project.name,
        vocabRoot: project.vocabRoot,
        apiPort: project.apiPort,
      })),
    }, null, 2) + "\n",
    "utf8",
  )

  const entries = await readdir(runtimeRoot, { withFileTypes: true })
  const sessionNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const toDelete = sessionNames.slice(0, Math.max(0, sessionNames.length - 5))
  await Promise.all(
    toDelete.map((name) => rm(join(runtimeRoot, name), { recursive: true, force: true })),
  )

  return { sessionId, sessionDir }
}

// ---------------------------------------------------------------------------
// runServe
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Bundle and start a single API server for one project
// ---------------------------------------------------------------------------

const bundleAndStartApi = (
  proj: ProjectSpec,
  esbuildBin: string,
  tmpDir: string,
  runtimeSessionDir: string,
): Effect.Effect<ReturnType<typeof spawn> | null> =>
  Effect.gen(function* () {
    const vocabRoot = proj.vocabRoot

    // Load vocab
    const contextPaths = yield* Effect.promise(() => discoverFiles(vocabRoot, ".context.yaml"))
    const connectionPaths = yield* Effect.promise(() => discoverFiles(vocabRoot, ".connections.yaml"))
    const allContexts: BoundedContextDeclaration[] = []
    const allConnections: ConnectionsDeclaration[] = []
    for (const path of contextPaths) {
      const v = yield* readVocabFile(path).pipe(
        Effect.tapError((e) => Effect.sync(() => console.error(`  Warning: ${e.message}`))),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (v?.kind === "BoundedContext") allContexts.push(v)
    }
    for (const path of connectionPaths) {
      const v = yield* readVocabFile(path).pipe(
        Effect.tapError((e) => Effect.sync(() => console.error(`  Warning: ${e.message}`))),
        Effect.orElse(() => Effect.succeed(null)),
      )
      if (v?.kind === "Connections") allConnections.push(v)
    }
    const uniqueContexts = uniqueBy(allContexts, (ctx) => ctx.name)
    const uniqueConnections = uniqueBy(allConnections, (conn) => conn.context)
    const connectionsByContext = new Map(uniqueConnections.map((conn) => [conn.context, conn]))

    // Determine registry output dir
    const srcDir = join(vocabRoot, "src")
    const generatedDir = join(vocabRoot, "generated")
    const hasSrc = existsSync(srcDir)
    const registryOutDir = hasSrc ? srcDir : generatedDir
    yield* Effect.promise(() => mkdir(registryOutDir, { recursive: true }))
    if (!hasSrc) {
      for (const ctx of uniqueContexts) {
        const contextOutDir = join(registryOutDir, ctx.name)
        yield* Effect.promise(() => mkdir(contextOutDir, { recursive: true }))
        const files = generateContext(ctx, { strict: false, connections: connectionsByContext.get(ctx.name) })
        for (const file of files) {
          const filePath = join(contextOutDir, file.filename)
          if (!existsSync(filePath) || file.overwriteExisting) {
            yield* Effect.promise(() => writeFile(filePath, file.content, "utf-8"))
          }
        }
      }
    }
    const registryContent = generateRegistry(uniqueContexts, uniqueConnections, { strict: true })
    yield* Effect.promise(() => writeFile(join(registryOutDir, "registry.ts"), registryContent, "utf-8"))
    const catalogSnapshotPath = join(registryOutDir, "_rta_catalog.json")
    const catalog = yield* Effect.promise(() => buildCatalog(vocabRoot))
    yield* Effect.promise(() =>
      writeFile(catalogSnapshotPath, JSON.stringify(catalog, null, 2) + "\n", "utf-8"),
    )

    // Bundle API server
    const entryPath = join(registryOutDir, "_rta_serve_entry.ts")
    const safeName = proj.name.replace(/[^a-z0-9]/gi, "-")
    const bundlePath = join(tmpDir, `server-${safeName}.mjs`)
    yield* Effect.promise(() =>
      writeFile(
        entryPath,
        buildApiEntryContent(proj.apiPort, vocabRoot, catalogSnapshotPath),
        "utf-8",
      ),
    )

    const bundleOk = yield* Effect.async<boolean>((resume) => {
      const eb = spawn(
        esbuildBin,
        [
          entryPath,
          "--bundle",
          "--platform=node",
          "--format=esm",
          "--outfile=" + bundlePath,
          "--log-level=warning",
          `--banner:js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
        ],
        { stdio: "inherit" },
      )
      eb.on("error", (e) => { console.error("esbuild error:", e.message); resume(Effect.succeed(false)) })
      eb.on("close", (code) => resume(Effect.succeed(code === 0)))
    })
    yield* Effect.promise(() => unlink(entryPath).catch(() => undefined))

    if (!bundleOk) {
      const runtimeUnavailableReason = `Failed to bundle runtime API for ${proj.name}; catalog is still available.`
      console.error(`  ${runtimeUnavailableReason}`)
      const catalogOnlyEntryPath = join(registryOutDir, "_rta_catalog_entry.ts")
      yield* Effect.promise(() =>
        writeFile(
          catalogOnlyEntryPath,
          buildCatalogOnlyEntryContent(
            proj.apiPort,
            vocabRoot,
            catalogSnapshotPath,
            runtimeUnavailableReason,
          ),
          "utf-8",
        ),
      )
      const catalogBundleOk = yield* Effect.async<boolean>((resume) => {
        const eb = spawn(
          esbuildBin,
          [
            catalogOnlyEntryPath,
            "--bundle",
            "--platform=node",
            "--format=esm",
            "--outfile=" + bundlePath,
            "--log-level=warning",
          ],
          { stdio: "inherit" },
        )
        eb.on("error", (e) => { console.error("esbuild error:", e.message); resume(Effect.succeed(false)) })
        eb.on("close", (code) => resume(Effect.succeed(code === 0)))
      })
      yield* Effect.promise(() => unlink(catalogOnlyEntryPath).catch(() => undefined))
      if (!catalogBundleOk) {
        console.error(`  Failed to bundle catalog API for ${proj.name}.`)
        return null
      }
    }

    const child = spawn("node", [bundlePath], {
      stdio: "inherit",
      env: {
        ...process.env,
        RTA_RUNTIME_SESSION_DIR: runtimeSessionDir,
        RTA_RUNTIME_PROJECT_NAME: proj.name,
      },
    })
    child.on("error", (e) => console.error(`API server error (${proj.name}):`, e.message))
    return child
  })

// ---------------------------------------------------------------------------
// Auto-discover projects from apps/examples/ subdirectories
// ---------------------------------------------------------------------------

const discoverExampleProjects = async (cwd: string, baseApiPort: number): Promise<ProjectSpec[]> => {
  const examplesDir = join(cwd, "apps", "examples")
  if (!existsSync(examplesDir)) return []
  try {
    const entries = await readdir(examplesDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && e.name !== "node_modules")
      .map((e, i) => ({
        name: e.name,
        vocabRoot: resolve(examplesDir, e.name),
        apiPort: baseApiPort + i,
      }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// runServe
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// runProjectTests — run `pnpm run test` in a project dir before serving.
// Failures are non-fatal: the server still starts, captures may just be stale.
// ---------------------------------------------------------------------------

function runProjectTests(proj: ProjectSpec): Promise<void> {
  if (!existsSync(join(proj.vocabRoot, "package.json"))) return Promise.resolve()
  return new Promise((resolve) => {
    process.stdout.write(`  ▸ ${proj.name}: running tests... `)
    const child = spawn("pnpm", ["run", "test"], {
      cwd: proj.vocabRoot,
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout?.resume()
    child.stderr?.resume()
    child.on("close", (code) => {
      process.stdout.write(code === 0 ? "✓\n" : `✗ (exit ${code ?? "?"})\n`)
      resolve()
    })
    child.on("error", () => { process.stdout.write("✗ (spawn failed)\n"); resolve() })
  })
}

export const runServe = (opts: ServeOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const port = opts.port ?? 5173
    const baseApiPort = opts.apiPort ?? 5174

    const distDir = resolve(import.meta.dirname ?? __dirname)
    const esbuildBin = resolveEsbuild(distDir)

    // -----------------------------------------------------------------------
    // Resolve project list
    // -----------------------------------------------------------------------

    const rawRoots = opts.roots ?? (opts.root ? [opts.root] : [])
    let projects: ProjectSpec[]

    if (rawRoots.length === 0) {
      // Auto-discover from apps/examples/ in cwd
      projects = yield* Effect.promise(() => discoverExampleProjects(process.cwd(), baseApiPort))
      if (projects.length === 0) {
        // Fall back to cwd as single project
        const vocabRoot = process.cwd()
        projects = [{ name: basename(vocabRoot), vocabRoot, apiPort: baseApiPort }]
      }
    } else {
      projects = rawRoots.map((r, i) => ({
        name: basename(resolve(r)),
        vocabRoot: resolve(r),
        apiPort: baseApiPort + i,
      }))
    }

    // -----------------------------------------------------------------------
    // Run tests for each project to refresh scenario captures
    // -----------------------------------------------------------------------

    console.log(`Refreshing scenario captures...`)
    yield* Effect.promise(() => Promise.all(projects.map(runProjectTests)))
    console.log()

    const runtimeSession = yield* Effect.promise(() =>
      prepareRuntimeSession(process.cwd(), projects),
    )

    // -----------------------------------------------------------------------
    // Bundle and start one API server per project
    // -----------------------------------------------------------------------

    const tmpDir = join(tmpdir(), `rta-serve-${process.pid}`)
    yield* Effect.promise(() => mkdir(tmpDir, { recursive: true }))

    console.log(`Ṛta`)
    console.log(`  catalog    : open any project catalog URL below`)
    console.log(`  control    : ${port} recorded for server-control compatibility`)
    console.log(`  runtime    : ${runtimeSession.sessionDir}`)
    for (const proj of projects) {
      const projectBaseUrl = `http://localhost:${proj.apiPort}`
      console.log(`  ${proj.name.padEnd(16)}: ${projectBaseUrl}/catalog`)
      console.log(`  ${"".padEnd(18)}api: ${projectBaseUrl}/api/v1/catalog`)
    }
    console.log()

    const apiChildren: Array<ReturnType<typeof spawn>> = []
    for (const proj of projects) {
      const child = yield* bundleAndStartApi(
        proj,
        esbuildBin,
        tmpDir,
        join(runtimeSession.sessionDir, proj.name),
      )
      if (child) apiChildren.push(child)
    }

    yield* Effect.promise(() =>
      writeServerState({
        pid: process.pid,
        startedAt: new Date().toISOString(),
        root: process.cwd(),
        port,
        apiPort: baseApiPort,
        runtimeSessionDir: runtimeSession.sessionDir,
        argv: process.argv,
        projects: projects.map((project) => ({
          name: project.name,
          vocabRoot: project.vocabRoot,
          apiPort: project.apiPort,
          catalogUrl: `http://localhost:${project.apiPort}/catalog`,
          apiUrl: `http://localhost:${project.apiPort}/api/v1/catalog`,
        })),
      }),
    )

    const exitCode = yield* Effect.async<number>((resume) => {
      let done = false
      const keepAlive = setInterval(() => undefined, 60_000)
      const finish = (code: number) => {
        if (done) return
        done = true
        clearInterval(keepAlive)
        process.off("SIGINT", shutdown)
        process.off("SIGTERM", shutdown)
        resume(Effect.succeed(code))
      }
      const shutdown = () => {
        for (const child of apiChildren) child.kill()
        void removeServerState(process.cwd()).finally(() => finish(0))
      }
      process.once("SIGINT", shutdown)
      process.once("SIGTERM", shutdown)
      if (apiChildren.length === 0) finish(1)
      for (const child of apiChildren) {
        child.once("close", () => {
          if (apiChildren.every((apiChild) => apiChild.exitCode !== null || apiChild.signalCode !== null)) {
            void removeServerState(process.cwd()).finally(() => finish(1))
          }
        })
      }
    })

    return exitCode
  })
