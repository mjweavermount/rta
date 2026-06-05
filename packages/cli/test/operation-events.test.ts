import { describe, expect, it } from "vitest"
import { Effect } from "effect"
import { readVocabFile } from "@rta/vocab"
import { resolve } from "node:path"
import {
  deriveConnectionsOperationEventContracts,
  deriveContextOperationEventContracts,
  deriveDecisionOperationEventContract,
  deriveProcessManagerOperationEventContract,
  deriveReactionOperationEventContract,
  deriveRuleOperationEventContract,
  formatOperationEventMarker,
} from "../src/operation-events.js"

const fixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/contexts/order-management-with-logic.context.yaml",
)
const connectionsFixturePath = resolve(
  __dirname,
  "../../vocab/test/fixtures/connections/order-management-with-reactions.connections.yaml",
)

describe("operation event contracts", () => {
  it("derives rule and decision readable-log contracts", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const aggregate = parsed.aggregates?.[0]
    const rule = aggregate?.rules?.[0]
    const decision = parsed.decisions?.[0]
    expect(aggregate).toBeDefined()
    expect(rule).toBeDefined()
    expect(decision).toBeDefined()
    if (!aggregate || !rule || !decision) return

    const ruleContract = deriveRuleOperationEventContract(parsed.name, aggregate.name, rule)
    const decisionContract = deriveDecisionOperationEventContract(parsed.name, decision)

    expect(ruleContract.requiredReadableSummary).toBe(true)
    expect(ruleContract.requiredPhases).toEqual(["received", "completed", "failed"])
    expect(decisionContract.requiredPhases).toEqual(["received", "completed"])
    expect(formatOperationEventMarker(ruleContract.id)).toMatch(/^@rta-operation-event /)
  })

  it("derives reaction operation-event contracts from connections declarations", async () => {
    const parsed = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (parsed.kind !== "Connections") return

    const reaction = parsed.reactions?.[0]
    expect(reaction).toBeDefined()
    if (!reaction) return

    const contract = deriveReactionOperationEventContract(parsed.context, reaction)
    expect(contract.requiredPhases).toEqual(["received", "emitted", "completed"])
    expect(contract.description).toContain("readable")
  })

  it("derives full context and connection operation-event inventories", async () => {
    const context = await Effect.runPromise(readVocabFile(fixturePath))
    const connections = await Effect.runPromise(readVocabFile(connectionsFixturePath))
    if (context.kind !== "BoundedContext" || connections.kind !== "Connections") return

    expect(deriveContextOperationEventContracts(context).length).toBeGreaterThan(0)
    expect(deriveConnectionsOperationEventContracts(connections).length).toBeGreaterThan(0)
  })

  it("derives process-manager operation-event contracts", async () => {
    const parsed = await Effect.runPromise(readVocabFile(fixturePath))
    if (parsed.kind !== "BoundedContext") return

    const processManager = parsed.processManagers?.[0]
    expect(processManager).toBeDefined()
    if (!processManager) return

    const contract = deriveProcessManagerOperationEventContract(parsed.name, processManager)
    expect(contract.requiredPhases).toEqual(["received", "state-changed", "emitted", "completed", "failed"])
  })
})
