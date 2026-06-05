import { readFile } from "node:fs/promises"
import { resolve, sep } from "node:path"
import { Effect, Schema } from "effect"
import {
  EdgeBoundaryError,
  EdgeBoundaryTypeId,
  type EdgeBoundary,
  type OperationScope,
  type Reason,
} from "@rta/core"
import { InstrumentedEdgeBoundary, type OperationSummary } from "@rta/strict"
import { createRuntimeScope } from "./scope.js"

export class SchemaEdgeBoundary<I, O>
  extends InstrumentedEdgeBoundary<{ readonly input: I; readonly reason: Reason }, O, EdgeBoundaryError>
  implements EdgeBoundary<I, O> {
  readonly [EdgeBoundaryTypeId]: typeof EdgeBoundaryTypeId = EdgeBoundaryTypeId
  readonly name: string
  readonly system: string

  constructor(readonly options: {
    readonly name: string
    readonly system: string
    readonly schema: Schema.Schema<O, I>
    readonly scope?: OperationScope
  }) {
    super(options.name, options.system)
    this.name = options.name
    this.system = options.system
  }

  parse(input: I, reason: Reason, scope = this.options.scope ?? createRuntimeScope(this.name)): Effect.Effect<O, EdgeBoundaryError> {
    return this.invoke({ input, reason }, scope)
  }

  protected summarize(input: { readonly reason: Reason }): OperationSummary {
    return {
      action: `Promote input through ${this.name}`,
      reason: input.reason.message,
      with: [this.system],
      output: "validated internal input",
      lineage: ["primitive:edge-boundary", `system:${this.system}`],
      boundary: {
        system: this.system,
        operation: this.name,
        mode: "read",
      },
    }
  }

  protected execute(input: {
    readonly input: I
    readonly reason: Reason
  }): Effect.Effect<O, EdgeBoundaryError> {
    return Schema.decodeUnknown(this.options.schema)(input.input).pipe(
      Effect.mapError((cause) => new EdgeBoundaryError({
        message: "edge boundary rejected input",
        boundary: this.name,
        cause,
      })),
    )
  }
}

export class FileReadBoundary
  extends InstrumentedEdgeBoundary<{ readonly path: string; readonly reason: Reason }, string, EdgeBoundaryError> {
  constructor(readonly options: {
    readonly root: string
    readonly name?: string
    readonly scope?: OperationScope
  }) {
    super(options.name ?? "FileReadBoundary", "file-system")
  }

  read(path: string, reason: Reason, scope = this.options.scope ?? createRuntimeScope("FileReadBoundary")): Effect.Effect<string, EdgeBoundaryError> {
    return this.invoke({ path, reason }, scope)
  }

  protected summarize(input: { readonly path: string; readonly reason: Reason }): OperationSummary {
    return {
      action: `Read file ${input.path}`,
      reason: input.reason.message,
      with: ["file-system"],
      input: input.path,
      output: "untrusted text",
      lineage: ["primitive:edge-boundary", "system:file-system"],
      boundary: {
        system: "file-system",
        operation: "readFile",
        mode: "read",
      },
    }
  }

  protected execute(input: { readonly path: string }): Effect.Effect<string, EdgeBoundaryError> {
    const root = resolve(this.options.root)
    const target = resolve(root, input.path)
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      return Effect.fail(new EdgeBoundaryError({
        message: "file boundary rejected path outside root",
        boundary: this.primitiveName,
        cause: { root, target },
      }))
    }
    return Effect.tryPromise({
      try: () => readFile(target, "utf8"),
      catch: (cause) => new EdgeBoundaryError({
        message: "file boundary failed to read input",
        boundary: this.primitiveName,
        cause,
      }),
    })
  }
}
