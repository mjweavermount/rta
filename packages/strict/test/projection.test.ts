import { describe, expect, it } from "vitest"
import {
  createReadableLogBuffer,
  projectCommandHandlerSpan,
  projectExecutionEventToLogLine,
  projectExecutionEventToOtelSpanEvent,
  projectValidatedExecutionEventToOtelSpanEvent,
  projectValidatedCommandHandlerSpan,
  validateOtelSpanDescriptor,
} from "../src/index.js"
import { emitPrimitiveLifecycle } from "../src/index.js"

describe("execution telemetry projections", () => {
  it("projects handler span descriptors from strict command metadata", () => {
    const span = projectValidatedCommandHandlerSpan({
      _tag: "PlaceOrder",
      payload: { orderId: "ord-1" },
      messageId: "msg-1",
      correlationId: "corr-1",
      causationId: "cause-1",
      issuedBy: "user-1",
      issuedAt: new Date(),
    })

    expect(span.name).toBe("cmd.PlaceOrder")
    expect(span.attributes["rta.command.tag"]).toBe("PlaceOrder")
    expect(span.attributes["rta.correlation.id"]).toBe("corr-1")
    expect(validateOtelSpanDescriptor(projectCommandHandlerSpan({
      _tag: "PlaceOrder",
      payload: { orderId: "ord-1" },
      messageId: "msg-1",
      correlationId: "corr-1",
      causationId: "cause-1",
      issuedBy: "user-1",
      issuedAt: new Date(),
    })).name).toBe("cmd.PlaceOrder")
  })

  it("projects execution events into OTEL span-event descriptors", () => {
    const projected = projectValidatedExecutionEventToOtelSpanEvent({
      primitiveType: "reaction",
      primitiveName: "ReserveInventoryOnOrderPlaced",
      phase: "completed",
      context: "OrderManagement",
      triggerEvent: "OrderPlaced",
      from: "OrderManagement",
      to: "InventoryContext",
      emittedCommands: ["ReserveInventory"],
    })

    expect(projected.name).toBe("reaction.completed")
    expect(projected.attributes["rta.primitive.type"]).toBe("reaction")
    expect(projected.attributes["rta.emitted.count"]).toBe(1)
  })

  it("projects execution events into human-readable log lines", () => {
    const line = projectExecutionEventToLogLine({
      primitiveType: "process-manager",
      primitiveName: "AppointmentFulfillmentManager",
      phase: "completed",
      context: "Booking",
      triggerEvent: "AppointmentBooked",
      nextState: { status: "payment-pending" },
      emittedCommands: ["InitiatePayment"],
      terminal: false,
    })

    expect(line).toBe("[normal] APPOINTMENT_FULFILLMENT_MANAGER Completed process AppointmentBooked")
  })

  it("projects rule violations into terse operator-readable normal logs", () => {
    const line = projectExecutionEventToLogLine({
      primitiveType: "rule",
      primitiveName: "RULE-NO_DUP_IDS",
      phase: "completed",
      aggregate: "Obj",
      context: "ObjectIndex",
      violation: "Obj.id",
      summary: {
        action: "Rejected Obj.id",
        reason: "duplicate ids cannot be indexed",
        with: ["candidate object", "existing object"],
      },
    })

    expect(line).toBe("[normal] RULE-NO_DUP_IDS Rejected Obj.id because duplicate ids cannot be indexed with candidate object and existing object")
  })

  it("projects trace logs with correlation fields and primitive diagnostics", () => {
    const line = projectExecutionEventToLogLine({
      primitiveType: "command-handler",
      primitiveName: "DigestMeetingHandler",
      phase: "started",
      messageTag: "DigestMeeting",
      context: "MeetingDigest",
      correlationId: "trace-1",
      causationId: "op-1",
      messageId: "span-1",
      summary: {
        action: "Digest meeting-1",
        reason: "the transcript is ready",
        input: "1200 transcript chars",
        output: "MeetingDigestCreated event staged",
      },
    }, { verbosity: "trace" })

    expect(line).toContain("[trace] DIGEST_MEETING_HANDLER Started command Digest meeting-1 because the transcript is ready")
    expect(line).toContain("context=MeetingDigest")
    expect(line).toContain("correlationId=trace-1")
    expect(line).toContain("input=1200 transcript chars")
  })

  it("can subscribe a readable log sink to the canonical execution stream", () => {
    const buffer = createReadableLogBuffer()
    emitPrimitiveLifecycle({
      primitiveType: "decision",
      primitiveName: "InvoiceRiskBandDecision",
      phase: "completed",
      context: "Billing",
      outcome: "High",
    })
    buffer.stop()

    expect(buffer.entries.length).toBe(1)
    expect(buffer.entries[0]?.line).toBe("[normal] INVOICE_RISK_BAND_DECISION Chose High")
  })
})
