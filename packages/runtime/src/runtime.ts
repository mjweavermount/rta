import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Effect } from "effect"
import { DomainError } from "@rta/core"

export type RunStatus = "running" | "completed" | "failed"
export type UnitOfWorkStatus = RunStatus

export interface RuntimeClock {
  readonly now: () => Date
}

export interface ArtifactRef {
  readonly name: string
  readonly path: string
}

export interface UnitOfWorkState {
  readonly id: string
  readonly name: string
  readonly status: UnitOfWorkStatus
  readonly parent?: string | null
  readonly startedAt: string
  readonly completedAt?: string
  readonly error?: string
}

export interface RunState {
  readonly runId: string
  readonly status: RunStatus
  readonly artifacts: ReadonlyArray<ArtifactRef>
  readonly reviews: ReadonlyArray<string>
  readonly unitOfWorks: ReadonlyArray<UnitOfWorkState>
}

export interface ProvenanceNode {
  readonly id: string
  readonly type: "run" | "step" | "artifact"
  readonly path?: string
  readonly step?: string
  readonly at?: string
  readonly actor?: string
  readonly unitOfWork?: string
}

export interface ProvenanceEdge {
  readonly from: string
  readonly to: string
  readonly type: "step" | "produced"
}

export interface ProvenanceGraph {
  readonly nodes: ReadonlyArray<ProvenanceNode>
  readonly edges: ReadonlyArray<ProvenanceEdge>
}

export interface RuntimeStep {
  readonly step: string
  readonly actor?: string
  readonly at?: string
  readonly parent?: string | null
  readonly unitOfWork?: string
}

export interface OperationLoggerLike {
  readonly step: (event: {
    readonly runId: string
    readonly actor: string
    readonly step: string
    readonly input?: unknown
    readonly output?: unknown
    readonly parent?: string | null
    readonly unitOfWork: string
    readonly detail?: unknown
  }) => void
}

export class RuntimeError extends DomainError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super({ message, context })
  }
}

export class FileRuntime {
  readonly runRoot: string
  private state: RunState
  private provenance: ProvenanceGraph

  constructor(
    readonly options: {
      readonly root: string
      readonly runId: string
      readonly clock?: RuntimeClock
    },
  ) {
    this.runRoot = join(options.root, ".rta", "runs", options.runId)
    this.state = initialState(options.runId)
    this.provenance = initialProvenance(options.runId)
  }

  static create(options: {
    readonly root: string
    readonly runId: string
    readonly clock?: RuntimeClock
  }): Effect.Effect<FileRuntime, RuntimeError> {
    const runtime = new FileRuntime(options)
    return runtime.ensure().pipe(
      Effect.flatMap(() => runtime.saveState()),
      Effect.as(runtime),
    )
  }

  get runId(): string {
    return this.options.runId
  }

  ensure(): Effect.Effect<void, RuntimeError> {
    return Effect.tryPromise({
      try: async () => {
        await mkdir(this.runRoot, { recursive: true })
        await mkdir(join(this.runRoot, "artifacts"), { recursive: true })
      },
      catch: (cause) => new RuntimeError("failed to initialize runtime", { runId: this.runId, cause }),
    })
  }

  recordStep(event: RuntimeStep): Effect.Effect<void, RuntimeError> {
    const id = sanitizeId(`${event.step}-${this.provenance.nodes.length}`)
    this.provenance = {
      nodes: [
        ...this.provenance.nodes,
        {
          id,
          type: "step",
          step: event.step,
          at: event.at ?? this.nowIso(),
          actor: event.actor,
          unitOfWork: event.unitOfWork,
        },
      ],
      edges: [
        ...this.provenance.edges,
        { from: event.parent ?? this.runId, to: id, type: "step" },
      ],
    }
    return this.saveArtifactRaw("provenance.json", this.provenance).pipe(Effect.asVoid)
  }

  operation<T, E, R>(options: {
    readonly logger: OperationLoggerLike
    readonly name: string
    readonly actor?: string
    readonly input?: unknown
    readonly detail?: unknown
    readonly parent?: string | null
    readonly run: () => Effect.Effect<T, E, R>
  }): Effect.Effect<T, E | RuntimeError, R> {
    const actor = options.actor ?? "system"
    const unitOfWork = sanitizeId(`${options.name}-${this.state.unitOfWorks.length + 1}`)
    this.state = {
      ...this.state,
      unitOfWorks: [
        ...this.state.unitOfWorks,
        {
          id: unitOfWork,
          name: options.name,
          status: "running",
          parent: options.parent,
          startedAt: this.nowIso(),
        },
      ],
    }
    options.logger.step({
      runId: this.runId,
      actor,
      step: `${options.name}.start`,
      input: options.input,
      output: "starting",
      parent: options.parent,
      unitOfWork,
      detail: options.detail,
    })

    return this.saveState().pipe(
      Effect.flatMap(() => options.run()),
      Effect.tap((output) =>
        this.updateUnitOfWork(unitOfWork, { status: "completed", completedAt: this.nowIso() }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              options.logger.step({
                runId: this.runId,
                actor,
                step: `${options.name}.complete`,
                input: options.input,
                output,
                parent: options.parent,
                unitOfWork,
                detail: options.detail,
              })
            }),
          ),
        ),
      ),
      Effect.catchAll((cause) => {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        return this.updateUnitOfWork(unitOfWork, {
          status: "failed",
          completedAt: this.nowIso(),
          error: error.message,
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              options.logger.step({
                runId: this.runId,
                actor,
                step: `${options.name}.failed`,
                input: options.input,
                output: error.message,
                parent: options.parent,
                unitOfWork,
                detail: { ...(isRecord(options.detail) ? options.detail : {}), name: error.name, stack: error.stack },
              })
            }),
          ),
          Effect.flatMap(() => Effect.fail(cause)),
        )
      }),
    )
  }

  updateUnitOfWork(id: string, patch: Partial<UnitOfWorkState>): Effect.Effect<void, RuntimeError> {
    this.state = {
      ...this.state,
      unitOfWorks: this.state.unitOfWorks.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }
    return this.saveState()
  }

  saveArtifact(name: string, data: unknown): Effect.Effect<string, RuntimeError> {
    return this.saveArtifactRaw(name, data).pipe(
      Effect.flatMap((path) => {
        this.state = {
          ...this.state,
          artifacts: [...this.state.artifacts, { name, path }],
        }
        this.provenance = {
          nodes: [...this.provenance.nodes, { id: name, type: "artifact", path }],
          edges: [...this.provenance.edges, { from: this.runId, to: name, type: "produced" }],
        }
        return this.saveArtifactRaw("provenance.json", this.provenance).pipe(
          Effect.flatMap(() => this.saveState()),
          Effect.as(path),
        )
      }),
    )
  }

  saveArtifactRaw(name: string, data: unknown): Effect.Effect<string, RuntimeError> {
    const path = join(this.runRoot, "artifacts", name)
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2)
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => writeFile(path, content, "utf8"),
          catch: (cause) => new RuntimeError("failed to write artifact", { runId: this.runId, name, cause }),
        }),
      ),
      Effect.as(path),
    )
  }

  saveState(patch: Partial<RunState> = {}): Effect.Effect<void, RuntimeError> {
    this.state = { ...this.state, ...patch }
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => writeFile(join(this.runRoot, "state.json"), JSON.stringify(this.state, null, 2), "utf8"),
          catch: (cause) => new RuntimeError("failed to write run state", { runId: this.runId, cause }),
        }),
      ),
    )
  }

  loadState(): Effect.Effect<RunState, RuntimeError> {
    return this.ensure().pipe(
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => JSON.parse(await readFile(join(this.runRoot, "state.json"), "utf8")) as RunState,
          catch: (cause) => new RuntimeError("failed to read run state", { runId: this.runId, cause }),
        }),
      ),
    )
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}

export function createRunId(prefix = "run", clock: RuntimeClock = { now: () => new Date() }): string {
  return `${prefix}-${clock.now().toISOString().replace(/[:.]/g, "-")}`
}

const initialState = (runId: string): RunState => ({
  runId,
  status: "running",
  artifacts: [],
  reviews: [],
  unitOfWorks: [],
})

const initialProvenance = (runId: string): ProvenanceGraph => ({
  nodes: [{ id: runId, type: "run" }],
  edges: [],
})

const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9_.-]/g, "-")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
