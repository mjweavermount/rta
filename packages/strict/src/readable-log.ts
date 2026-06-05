import {
  projectExecutionEventToLogLine,
  type ReadableLogProjectionOptions,
  validateOtelSpanDescriptor,
  validateOtelSpanEventDescriptor,
} from "./projection.js"
import {
  subscribePrimitiveLifecycle,
  type PrimitiveExecutionEvent,
} from "./lifecycle.js"

export interface ReadableLogEntry {
  readonly line: string
  readonly event: PrimitiveExecutionEvent
}

export type ReadableLogWriter = (entry: ReadableLogEntry) => void

export function startReadableLogSink(
  writer: ReadableLogWriter,
  options: ReadableLogProjectionOptions = {},
): () => void {
  return subscribePrimitiveLifecycle((event) => {
    writer({
      event,
      line: projectExecutionEventToLogLine(event, options),
    })
  })
}

export function createReadableLogBuffer(options: ReadableLogProjectionOptions = {}): {
  readonly entries: ReadonlyArray<ReadableLogEntry>
  readonly stop: () => void
} {
  const entries: ReadableLogEntry[] = []
  const stop = startReadableLogSink((entry) => {
    entries.push(entry)
  }, options)
  return { entries, stop }
}

// Compile-time import guard: these helpers must stay available from projection.
void validateOtelSpanDescriptor
void validateOtelSpanEventDescriptor
