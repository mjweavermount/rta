import { Schema } from "effect"
import type {
  PrimitiveExecutionEvent,
  PrimitiveOperationSummary,
} from "./lifecycle.js"
import type { StrictCommand, StrictDomainEvent, StrictQuery } from "./message.js"

export type OtelAttributeValue = string | number | boolean

export interface OtelSpanDescriptor {
  readonly name: string
  readonly attributes: Readonly<Record<string, OtelAttributeValue>>
}

export interface OtelSpanEventDescriptor {
  readonly name: string
  readonly attributes: Readonly<Record<string, OtelAttributeValue>>
}

const OtelAttributeValueSchema = Schema.Union(Schema.String, Schema.Number, Schema.Boolean)
const OtelAttributesSchema = Schema.Record({
  key: Schema.String,
  value: OtelAttributeValueSchema,
})

export const OtelSpanDescriptorSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  attributes: OtelAttributesSchema,
})

export const OtelSpanEventDescriptorSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  attributes: OtelAttributesSchema,
})

export const validateOtelSpanDescriptor = (descriptor: OtelSpanDescriptor): OtelSpanDescriptor =>
  Schema.decodeSync(OtelSpanDescriptorSchema)(descriptor)

export const validateOtelSpanEventDescriptor = (
  descriptor: OtelSpanEventDescriptor,
): OtelSpanEventDescriptor =>
  Schema.decodeSync(OtelSpanEventDescriptorSchema)(descriptor)

export const projectCommandHandlerSpan = <C extends StrictCommand<string, any>>(
  command: C,
): OtelSpanDescriptor => ({
  name: `cmd.${command._tag}`,
  attributes: {
    "messaging.operation": "process",
    "messaging.system": "rta",
    "rta.message.kind": "command",
    "rta.command.tag": command._tag,
    "rta.correlation.id": command.correlationId,
    "rta.causation.id": command.causationId,
    "rta.issued.by": command.issuedBy,
  },
})

export const projectQueryHandlerSpan = <Q extends StrictQuery<string, any, any>>(
  query: Q,
): OtelSpanDescriptor => ({
  name: `query.${query._tag}`,
  attributes: {
    "messaging.operation": "receive",
    "messaging.system": "rta",
    "rta.message.kind": "query",
    "rta.query.tag": query._tag,
    "rta.correlation.id": query.correlationId,
    "rta.issued.by": query.issuedBy,
  },
})

export const projectEventHandlerSpan = <E extends StrictDomainEvent<string, any>>(
  event: E,
): OtelSpanDescriptor => ({
  name: `event.${event._tag}`,
  attributes: {
    "messaging.operation": "process",
    "messaging.system": "rta",
    "rta.message.kind": "domain-event",
    "rta.event.tag": event._tag,
    "rta.correlation.id": event.correlationId,
    "rta.causation.id": event.causationId,
    "rta.aggregate.id": event.aggregateId,
    "rta.aggregate.type": event.aggregateType,
  },
})

export const projectExecutionEventToOtelSpanEvent = (
  event: PrimitiveExecutionEvent,
): OtelSpanEventDescriptor => {
  const base: Record<string, OtelAttributeValue> = {
    "rta.primitive.type": event.primitiveType,
    "rta.primitive.name": event.primitiveName,
    "rta.phase": event.phase,
  }

  switch (event.primitiveType) {
    case "rule":
      base["rta.context"] = event.context
      base["rta.aggregate"] = event.aggregate
      if (event.violation !== undefined) base["rta.violation"] = event.violation
      return { name: `rule.${event.phase}`, attributes: base }
    case "decision":
      base["rta.context"] = event.context
      if (event.outcome !== undefined) base["rta.outcome"] = event.outcome
      return { name: `decision.${event.phase}`, attributes: base }
    case "reaction":
      base["rta.context"] = event.context
      base["rta.trigger"] = event.triggerEvent
      base["rta.from"] = event.from
      base["rta.to"] = event.to
      base["rta.emitted.count"] = event.emittedCommands.length
      return { name: `reaction.${event.phase}`, attributes: base }
    case "process-manager":
      base["rta.context"] = event.context
      base["rta.trigger"] = event.triggerEvent
      if (event.emittedCommands !== undefined) {
        base["rta.emitted.count"] = event.emittedCommands.length
      }
      if (event.terminal !== undefined) {
        base["rta.terminal"] = event.terminal
      }
      return { name: `process-manager.${event.phase}`, attributes: base }
    case "event":
      base["rta.from"] = event.from
      base["rta.to"] = event.to
      base["rta.correlation.id"] = event.correlationId
      base["rta.causation.id"] = event.causationId
      return { name: `event.${event.phase}`, attributes: base }
    case "command-handler":
    case "query-handler":
    case "event-handler":
      base["rta.context"] = event.context
      base["rta.message.tag"] = event.messageTag
      base["rta.correlation.id"] = event.correlationId
      if ("causationId" in event) {
        base["rta.causation.id"] = event.causationId
      }
      return { name: `${event.primitiveType}.${event.phase}`, attributes: base }
    case "inbound-adapter":
    case "outbound-adapter":
    case "bounded-context":
    case "scheduler":
    case "job":
    case "projector":
    case "repository":
    case "edge-boundary":
    case "secret":
    case "policy":
    case "guardrail":
      base["rta.context"] = event.context
      base["rta.correlation.id"] = event.correlationId
      base["rta.causation.id"] = event.causationId
      return { name: `${event.primitiveType}.${event.phase}`, attributes: base }
  }
}

export const projectValidatedCommandHandlerSpan = <C extends StrictCommand<string, any>>(
  command: C,
): OtelSpanDescriptor => validateOtelSpanDescriptor(projectCommandHandlerSpan(command))

export const projectValidatedQueryHandlerSpan = <Q extends StrictQuery<string, any, any>>(
  query: Q,
): OtelSpanDescriptor => validateOtelSpanDescriptor(projectQueryHandlerSpan(query))

export const projectValidatedEventHandlerSpan = <E extends StrictDomainEvent<string, any>>(
  event: E,
): OtelSpanDescriptor => validateOtelSpanDescriptor(projectEventHandlerSpan(event))

export const projectValidatedExecutionEventToOtelSpanEvent = (
  event: PrimitiveExecutionEvent,
): OtelSpanEventDescriptor =>
  validateOtelSpanEventDescriptor(projectExecutionEventToOtelSpanEvent(event))

export type ReadableLogVerbosity = "quiet" | "normal" | "verbose" | "trace"

export interface ReadableLogProjectionOptions {
  readonly verbosity?: ReadableLogVerbosity
}

export const projectExecutionEventToLogLine = (
  event: PrimitiveExecutionEvent,
  options: ReadableLogProjectionOptions = {},
): string => {
  const verbosity = options.verbosity ?? "normal"
  const code = primitiveCode(event)
  const sentence = humanSentence(event)
  const suffix = diagnosticSuffix(event, verbosity)
  return `[${verbosity}] ${code} ${sentence}${suffix}`
}

function primitiveCode(event: PrimitiveExecutionEvent): string {
  if (event.primitiveName === event.primitiveName.toUpperCase()) {
    return event.primitiveName
  }

  return event.primitiveName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function humanSentence(event: PrimitiveExecutionEvent): string {
  switch (event.primitiveType) {
    case "rule":
      if (event.phase === "failed") {
        return summarySentence(event.summary, "Failed rule", event.message ?? event.violation)
      }
      if (event.violation !== undefined) {
        return summarySentence(event.summary, "Rejected", event.violation)
      }
      return summarySentence(event.summary, event.phase === "received" ? "Evaluating" : "Accepted", event.aggregate)
    case "decision":
      if (event.outcome !== undefined) {
        return summarySentence(event.summary, "Chose", event.outcome)
      }
      return summarySentence(event.summary, event.phase === "received" ? "Evaluating" : "Completed decision", event.context)
    case "reaction":
      if (event.phase === "emitted" && event.emittedCommands.length > 0) {
        return summarySentence(event.summary, "Emitted", event.emittedCommands.join(", "))
      }
      return summarySentence(event.summary, `${capitalize(event.phase)} reaction`, event.triggerEvent)
    case "process-manager":
      if (event.phase === "emitted" && event.emittedCommands !== undefined && event.emittedCommands.length > 0) {
        return summarySentence(event.summary, "Emitted", event.emittedCommands.join(", "))
      }
      if (event.phase === "state-changed") {
        return summarySentence(event.summary, "Changed state", event.triggerEvent)
      }
      return summarySentence(event.summary, `${capitalize(event.phase)} process`, event.triggerEvent)
    case "event":
      return summarySentence(event.summary, "Emitted event", `${event.from} -> ${event.to}`)
    case "command-handler":
      return summarySentence(event.summary, `${capitalize(event.phase)} command`, event.messageTag)
    case "query-handler":
      return summarySentence(event.summary, `${capitalize(event.phase)} query`, event.messageTag)
    case "event-handler":
      return summarySentence(event.summary, `${capitalize(event.phase)} event handler`, event.messageTag)
    case "inbound-adapter":
      return summarySentence(event.summary, `${capitalize(event.phase)} inbound adapter`, event.context)
    case "outbound-adapter":
      return summarySentence(event.summary, `${capitalize(event.phase)} outbound adapter`, event.context)
    case "bounded-context":
      return summarySentence(event.summary, `${capitalize(event.phase)} bounded context`, event.context)
    case "scheduler":
      return summarySentence(event.summary, `${capitalize(event.phase)} scheduler`, event.context)
    case "job":
      return summarySentence(event.summary, `${capitalize(event.phase)} job`, event.context)
    case "projector":
      return summarySentence(event.summary, `${capitalize(event.phase)} projector`, event.context)
    case "repository":
      return summarySentence(event.summary, `${capitalize(event.phase)} repository`, event.context)
    case "edge-boundary":
      return summarySentence(event.summary, `${capitalize(event.phase)} edge boundary`, event.context)
    case "secret":
      return summarySentence(event.summary, `${capitalize(event.phase)} secret`, event.context)
    case "policy":
      return summarySentence(event.summary, `${capitalize(event.phase)} policy`, event.context)
    case "guardrail":
      return summarySentence(event.summary, `${capitalize(event.phase)} guardrail`, event.context)
  }
}

function summarySentence(
  summary: PrimitiveOperationSummary | undefined,
  fallbackVerb: string,
  fallbackObject: string | undefined,
): string {
  const verbObject = summary === undefined
    ? [fallbackVerb, fallbackObject].filter(Boolean).join(" ")
    : summary.action.toLowerCase().startsWith(fallbackVerb.toLowerCase())
      ? summary.action
      : `${fallbackVerb} ${summary.action}`
  const reason = summary?.reason !== undefined ? ` because ${summary.reason}` : ""
  const withText = summary?.with !== undefined && summary.with.length > 0
    ? ` with ${formatList(summary.with)}`
    : ""
  return `${verbObject}${reason}${withText}`
}

function diagnosticSuffix(
  event: PrimitiveExecutionEvent,
  verbosity: ReadableLogVerbosity,
): string {
  if (verbosity === "quiet") return ""

  const fields: string[] = []
  if (verbosity === "verbose" || verbosity === "trace") {
    fields.push(`context=${contextOf(event)}`)
    fields.push(`phase=${event.phase}`)
    fields.push(`primitive=${event.primitiveType}`)
    const summary = "summary" in event ? event.summary : undefined
    if (summary?.input !== undefined) fields.push(`input=${summary.input}`)
    if (summary?.output !== undefined) fields.push(`output=${summary.output}`)
    if (summary?.lineage !== undefined && summary.lineage.length > 0) {
      fields.push(`lineage=${summary.lineage.join(",")}`)
    }
    if (summary?.boundary !== undefined) {
      fields.push(`system=${summary.boundary.system}`)
      fields.push(`operation=${summary.boundary.operation}`)
      fields.push(`mode=${summary.boundary.mode}`)
      if (summary.boundary.reviewRequired === true) fields.push("reviewRequired=true")
    }
  }

  if (verbosity === "trace") {
    if ("correlationId" in event) fields.push(`correlationId=${event.correlationId}`)
    if ("causationId" in event) fields.push(`causationId=${event.causationId}`)
    if ("messageId" in event) fields.push(`messageId=${event.messageId}`)
    if ("from" in event) fields.push(`from=${event.from}`)
    if ("to" in event) fields.push(`to=${event.to}`)
    if ("triggerEvent" in event) fields.push(`trigger=${event.triggerEvent}`)
    if ("emittedCommands" in event && event.emittedCommands !== undefined && event.emittedCommands.length > 0) {
      fields.push(`emitted=${event.emittedCommands.join(",")}`)
    }
    if ("terminal" in event && event.terminal === true) fields.push("terminal=true")
  }

  return fields.length > 0 ? ` (${fields.join(" ")})` : ""
}

function contextOf(event: PrimitiveExecutionEvent): string {
  if ("context" in event) return event.context
  if ("from" in event) return event.from
  return "unknown"
}

function formatList(values: ReadonlyArray<string>): string {
  if (values.length <= 2) return values.join(" and ")
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
