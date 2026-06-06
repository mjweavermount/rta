import { describe, expect, expectTypeOf, it } from "vitest"
import {
  adapterId,
  boundarySchemaId,
  brandedAdapterFitting,
  contextId,
  deploymentIntentId,
  operationId,
  portId,
  type AdapterId,
  type BoundarySchemaId,
  type ContextId,
  type DeploymentIntentId,
  type OperationId,
  type PortId,
} from "@rta/core"

describe("branded fittings", () => {
  it("keeps branded IDs human-readable at runtime", () => {
    const billing = contextId("Billing")
    const port = portId("AffineDocumentPort")
    const adapter = adapterId("LocalAffineDocumentAdapter")
    const operation = operationId("readDocument")
    const deployment = deploymentIntentId("HomeLabDraft")

    expect(billing).toBe("Billing")
    expect(port).toBe("AffineDocumentPort")
    expect(adapter).toBe("LocalAffineDocumentAdapter")
    expect(operation).toBe("readDocument")
    expect(deployment).toBe("HomeLabDraft")
  })

  it("brands string-like values by semantic fitting", () => {
    expectTypeOf<ContextId<"Billing">>().not.toEqualTypeOf<PortId<"Billing">>()
    expectTypeOf<PortId<"AffineDocumentPort">>().not.toEqualTypeOf<AdapterId<"AffineDocumentPort">>()
    expectTypeOf<OperationId<"readDocument">>().not.toEqualTypeOf<BoundarySchemaId<"readDocument">>()
    expectTypeOf<DeploymentIntentId<"HomeLabDraft">>().not.toEqualTypeOf<ContextId<"HomeLabDraft">>()
  })

  it("builds adapter fittings from the right branded pieces", () => {
    const fitting = brandedAdapterFitting({
      port: portId("AffineDocumentPort"),
      adapter: adapterId("LocalAffineDocumentAdapter"),
      inputSchema: boundarySchemaId("AffineDocReadInput"),
      outputSchema: boundarySchemaId("AffineDocReadOutput"),
    })

    expect(fitting).toEqual({
      kind: "BrandedAdapterFitting",
      port: "AffineDocumentPort",
      adapter: "LocalAffineDocumentAdapter",
      inputSchema: "AffineDocReadInput",
      outputSchema: "AffineDocReadOutput",
    })
  })

  it("rejects empty branded IDs", () => {
    expect(() => portId("")).toThrow("PortId requires a non-empty name")
    expect(() => boundarySchemaId("   ")).toThrow("BoundarySchemaId requires a non-empty name")
  })
})
