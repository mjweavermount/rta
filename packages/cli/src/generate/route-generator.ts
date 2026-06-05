import type { BoundedContextDeclaration } from "@rta/vocab"
import type { GeneratedFile } from "./context-generator.js"

// ---------------------------------------------------------------------------
// Route generator
//
// Produces two files per context when any commands/queries carry an `http:`
// annotation:
//
//   routes.ts          — always regenerated — Fastify registration skeletons,
//                        each delegates to a named function in route-handlers.ts
//
//   route-handlers.ts  — generated once, preserved — typed stubs the developer
//                        fills in; never clobbered on regen
//
// This split means:
//   • Adding a new `http:` operation → routes.ts gets the new delegation
//     automatically, route-handlers.ts gets a new TODO stub on first gen
//   • Existing handler implementations survive regen
//   • Missing handler functions are TypeScript compile errors, not runtime 404s
// ---------------------------------------------------------------------------

interface ParsedRoute {
  method: string    // "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string      // "/api/secrets/:secretId"
  pathParams: string[]  // ["secretId"]
}

function parseHttp(http: string): ParsedRoute | null {
  const parts = http.trim().split(/\s+/)
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const method = parts[0].toUpperCase()
  const path = parts[1]
  const pathParams = [...path.matchAll(/:([a-zA-Z][a-zA-Z0-9_]*)/g)].map((m) => m[1] ?? "")
  return { method, path, pathParams }
}

// Map a vocab FieldTypeExpr to a plain TypeScript type string (not Schema expr)
function toTsType(typeExpr: string): string {
  const optional = typeExpr.endsWith("| undefined") || typeExpr.endsWith("| undefined>")
  const base = typeExpr.replace(/\s*\|\s*undefined/, "").trim()

  let tsType: string
  if (base.endsWith("[]")) {
    tsType = `${toTsType(base.slice(0, -2))}[]`
  } else if (base === "String" || base === "NonEmptyString" || base === "Timestamp") {
    tsType = "string"
  } else if (base === "Int" || base === "Number" || base === "PositiveInt" || base === "Decimal") {
    tsType = "number"
  } else if (base === "Boolean") {
    tsType = "boolean"
  } else if (base === "Void") {
    tsType = "void"
  } else {
    // IDs and custom types → string at the HTTP boundary
    tsType = "string"
  }

  return optional ? `${tsType} | undefined` : tsType
}

function toHandlerName(operationName: string): string {
  return operationName.charAt(0).toLowerCase() + operationName.slice(1)
}

interface RouteEntry {
  operation: string
  kind: "command" | "query"
  route: ParsedRoute
  fields: ReadonlyArray<{ name: string; type: string }>
}

function collectEntries(ctx: BoundedContextDeclaration): RouteEntry[] {
  const entries: RouteEntry[] = []

  for (const agg of ctx.aggregates ?? []) {
    for (const cmd of agg.commands ?? []) {
      if (!cmd.http) continue
      const route = parseHttp(cmd.http)
      if (!route) continue
      entries.push({ operation: cmd.name, kind: "command", route, fields: cmd.payload ?? [] })
    }
  }

  for (const q of ctx.queries ?? []) {
    if (!q.http) continue
    const route = parseHttp(q.http)
    if (!route) continue
    entries.push({ operation: q.name, kind: "query", route, fields: q.parameters ?? [] })
  }

  return entries
}

// ---------------------------------------------------------------------------
// routes.ts — always regenerated
// ---------------------------------------------------------------------------

function generateRoutesFile(ctx: BoundedContextDeclaration, entries: RouteEntry[]): GeneratedFile {
  const fnName = `register${ctx.name}Routes`

  const registrations = entries.map((e) => {
    const method = e.route.method.toLowerCase()
    const handler = toHandlerName(e.operation)
    return [
      `  // ${e.operation} — ${e.route.method} ${e.route.path}`,
      `  app.${method}("${e.route.path}", (req, reply) => H.${handler}(req as never, reply))`,
    ].join("\n")
  }).join("\n\n")

  return {
    filename: "routes.ts",
    overwriteExisting: true,
    content: [
      `import type { FastifyInstance } from "fastify"`,
      `import * as H from "./route-handlers.js"`,
      ``,
      `/** Register all HTTP routes for the ${ctx.name} context. Call once at server startup. */`,
      `export function ${fnName}(app: FastifyInstance): void {`,
      registrations,
      `}`,
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// route-handlers.ts — generated once, then preserved
// ---------------------------------------------------------------------------

function generateRouteHandlersFile(_ctx: BoundedContextDeclaration, entries: RouteEntry[]): GeneratedFile {
  const fns = entries.map((e) => {
    const handler = toHandlerName(e.operation)
    const { pathParams, method } = e.route
    const isGet = method === "GET"

    const paramFields = e.fields.filter((f) => pathParams.includes(f.name))
    const bodyFields = e.fields.filter((f) => !pathParams.includes(f.name))

    const generics: string[] = []
    if (paramFields.length > 0) {
      const props = paramFields.map((f) => `${f.name}: string`).join("; ")
      generics.push(`Params: { ${props} }`)
    }
    if (isGet && bodyFields.length > 0) {
      const props = bodyFields.map((f) => `${f.name}?: string`).join("; ")
      generics.push(`Querystring: { ${props} }`)
    }
    if (!isGet && bodyFields.length > 0) {
      const props = bodyFields.map((f) => `${f.name}: ${toTsType(f.type)}`).join("; ")
      generics.push(`Body: { ${props} }`)
    }

    const typeParam = generics.length > 0 ? `<{ ${generics.join("; ")} }>` : ""

    return [
      `export async function ${handler}(`,
      `  req: FastifyRequest${typeParam},`,
      `  reply: FastifyReply,`,
      `): Promise<void> {`,
      `  // TODO: implement ${e.operation}`,
      `  return reply.status(501).send({ error: "Not implemented: ${e.operation}" })`,
      `}`,
    ].join("\n")
  }).join("\n\n")

  return {
    filename: "route-handlers.ts",
    overwriteExisting: false,
    content: [
      `import type { FastifyRequest, FastifyReply } from "fastify"`,
      ``,
      fns,
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateRoutes(ctx: BoundedContextDeclaration): GeneratedFile[] {
  const entries = collectEntries(ctx)
  if (entries.length === 0) return []
  return [
    generateRoutesFile(ctx, entries),
    generateRouteHandlersFile(ctx, entries),
  ]
}

// Manifest entry — used by manifest generator and the Console
export interface ManifestEntry {
  operation: string
  kind: "command" | "query"
  context: string
  method: string
  path: string
  pathParams: string[]
}

export function collectManifestEntries(ctx: BoundedContextDeclaration): ManifestEntry[] {
  return collectEntries(ctx).map((e) => ({
    operation: e.operation,
    kind: e.kind,
    context: ctx.name,
    method: e.route.method,
    path: e.route.path,
    pathParams: e.route.pathParams,
  }))
}
