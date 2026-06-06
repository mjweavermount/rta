import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

interface TraceContextIssue {
  readonly path: string
  readonly reason: string
}

interface TraceRequirement {
  readonly path: string
  readonly reason: string
  readonly needles: ReadonlyArray<string>
}

const requirements: ReadonlyArray<TraceRequirement> = [
  {
    path: "packages/core/src/operation-scope.ts",
    reason: "OperationScope must define and create canonical operation, trace, and span IDs",
    needles: [
      "readonly operationId: string",
      "readonly traceId: string",
      "readonly spanId: string",
      "operationId: id",
      "traceId: id",
      "spanId: this.random.uuid()",
      "traceId: this.traceId",
    ],
  },
  {
    path: "packages/strict/src/message.ts",
    reason: "Strict messages must carry the full execution envelope",
    needles: [
      "interface StrictCommand",
      "MessageContext",
      "readonly messageId: string",
      "interface StrictDomainEvent",
      "readonly correlationId: MessageContext[\"correlationId\"]",
      "readonly causationId: MessageContext[\"causationId\"]",
      "interface StrictQuery",
    ],
  },
  {
    path: "packages/strict/src/factories.ts",
    reason: "Strict factories must mint message IDs and preserve correlation and causation IDs",
    needles: [
      "defineStrictCommand",
      "defineStrictDomainEvent",
      "defineStrictQuery",
      "messageId: crypto.randomUUID()",
      "correlationId: context.correlationId",
      "causationId: context.causationId",
      "issuedAt: context.issuedAt",
    ],
  },
  {
    path: "packages/strict/src/lifecycle.ts",
    reason: "Lifecycle event contracts must expose correlation, causation, and message IDs",
    needles: [
      "CommandHandlerLifecycleEvent",
      "QueryHandlerLifecycleEvent",
      "EventHandlerLifecycleEvent",
      "GenericPrimitiveLifecycleEvent",
      "readonly correlationId: string",
      "readonly causationId: string",
      "readonly messageId: string",
    ],
  },
  {
    path: "packages/strict/src/primitive.ts",
    reason: "Instrumented primitives must emit IDs from OperationScope instead of leaf code",
    needles: [
      "correlationId: scope.traceId",
      "causationId: scope.operationId",
      "messageId: scope.spanId",
      "protected abstract execute",
      "protected abstract executeCommand",
      "protected abstract executeQuery",
      "protected abstract executeEvent",
    ],
  },
  {
    path: "packages/strict/src/otel.ts",
    reason: "OTEL wrappers must emit and project the same handler ID envelope",
    needles: [
      "withOtelCommandHandler",
      "withOtelQueryHandler",
      "withOtelEventHandler",
      "correlationId: query.correlationId",
      "causationId: query.causationId",
      "messageId: query.messageId",
    ],
  },
  {
    path: "packages/strict/src/projection.ts",
    reason: "Structured events must project canonical IDs into OTEL and trace-readable logs",
    needles: [
      "\"rta.message.id\"",
      "\"rta.correlation.id\"",
      "\"rta.causation.id\"",
      "correlationId=${event.correlationId}",
      "causationId=${event.causationId}",
      "messageId=${event.messageId}",
    ],
  },
  {
    path: "packages/cli/src/generate/registry-generator.ts",
    reason: "Generated strict registry dispatch must construct one full message context for commands and queries",
    needles: [
      "const messageContext = {",
      "correlationId: dispatchScope.traceId",
      "causationId: dispatchScope.operationId",
      "issuedAt: dispatchScope.clock.now()",
      "issuedBy: dispatchScope.identity.actorId",
    ],
  },
  {
    path: "packages/strict/test/factories.test.ts",
    reason: "Strict query tests must prove queries carry the full ID envelope",
    needles: [
      "expect(q.messageId).toEqual(expect.any(String))",
      "expect(q.causationId).toBe(ctx.causationId)",
      "expect(q.issuedAt).toBeInstanceOf(Date)",
    ],
  },
  {
    path: "packages/strict/test/projection.test.ts",
    reason: "Projection tests must prove trace logs and span descriptors expose IDs",
    needles: [
      "rta.message.id",
      "rta.causation.id",
      "messageId=span-1",
    ],
  },
]

const issue = (path: string, reason: string): TraceContextIssue => ({ path, reason })

const hasTraceContractFiles = (root: string): boolean =>
  existsSync(join(root, "packages/core/src/operation-scope.ts")) &&
  existsSync(join(root, "packages/strict/src/message.ts")) &&
  existsSync(join(root, "packages/cli/src/generate/registry-generator.ts"))

const resolveTraceContractRoot = (root: string): string => {
  let current = resolve(root)
  while (true) {
    if (hasTraceContractFiles(current)) return current
    const parent = dirname(current)
    if (parent === current) return resolve(root)
    current = parent
  }
}

export async function checkTraceContext(root: string): Promise<number> {
  const cwd = resolveTraceContractRoot(root)
  const issues: TraceContextIssue[] = []

  for (const requirement of requirements) {
    const path = join(cwd, requirement.path)
    if (!existsSync(path)) {
      issues.push(issue(requirement.path, "required trace-context file is missing"))
      continue
    }

    const content = readFileSync(path, "utf8")
    for (const needle of requirement.needles) {
      if (!content.includes(needle)) {
        issues.push(issue(requirement.path, `${requirement.reason}; missing ${JSON.stringify(needle)}`))
      }
    }
  }

  if (issues.length === 0) {
    console.log(`✓  Trace context: ${requirements.length}/${requirements.length} ID envelope contracts satisfied.`)
    return 0
  }

  console.error("✗  Trace context violations:\n")
  for (const item of issues) {
    console.error(`  ${item.path} — ${item.reason}`)
  }
  console.error(`\n${issues.length} trace context violation${issues.length === 1 ? "" : "s"} → FAIL`)
  return 1
}
