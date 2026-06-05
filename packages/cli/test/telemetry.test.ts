import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { readVocabFile } from "@rta/vocab"
import { resolve } from "node:path"
import {
  deriveConnectionsTelemetry,
  deriveContextTelemetry,
  deriveDecisionTelemetry,
  deriveProcessManagerTelemetry,
  deriveReactionTelemetry,
  deriveRuleTelemetry,
  formatTelemetryMarker,
} from "../src/telemetry.js"

const fixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/contexts/order-management-with-logic.context.yaml",
)
const connectionsFixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/connections/order-management-with-reactions.connections.yaml",
)

describe("execution telemetry expectations", () => {
  it("derives rule and decision execution phases", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const aggregate = parsed.aggregates?.[0]
    const rule = aggregate?.rules?.[0]
    const decision = parsed.decisions?.[0]
    expect(aggregate).toBeDefined()
    expect(rule).toBeDefined()
    expect(decision).toBeDefined()
    if (!aggregate || !rule || !decision) return

    const ruleTelemetry = deriveRuleTelemetry(parsed.name, aggregate.name, rule)
    const decisionTelemetry = deriveDecisionTelemetry(parsed.name, decision)

    expect(ruleTelemetry.phases).toEqual(["received", "completed", "failed"])
    expect(decisionTelemetry.phases).toEqual(["received", "completed"])
    expect(formatTelemetryMarker(ruleTelemetry.id)).toMatch(/^@rta-telemetry /)
  })

  it("derives reaction telemetry from connections declarations", async () => {
    const parsed = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (parsed.kind !== "Connections") return

    const reaction = parsed.reactions?.[0]
    expect(reaction).toBeDefined()
    if (!reaction) return

    const telemetry = deriveReactionTelemetry(parsed.context, reaction)
    expect(telemetry.phases).toEqual(["received", "emitted", "completed"])
  })

  it("derives full context and connection telemetry inventories", async () => {
    const context = await Effect.runPromise(readVocabFile(fixturePath))
    const connections = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (context.kind !== "BoundedContext" || connections.kind !== "Connections") return

    expect(deriveContextTelemetry(context).length).toBeGreaterThan(0)
    expect(deriveConnectionsTelemetry(connections).length).toBeGreaterThan(0)
  })

  it("derives process-manager telemetry expectations", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const processManager = parsed.processManagers?.[0]
    expect(processManager).toBeDefined()
    if (!processManager) return

    const telemetry = deriveProcessManagerTelemetry(parsed.name, processManager)
    expect(telemetry.phases).toEqual(["received", "state-changed", "emitted", "completed", "failed"])
  })
})
