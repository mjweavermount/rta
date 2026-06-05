import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
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
    mkdirSync(this.runRoot, { recursive: true })
    mkdirSync(join(this.runRoot, "artifacts"), { recursive: true })
    this.state = {
      runId: options.runId,
      status: "running",
      artifacts: [],
      reviews: [],
      unitOfWorks: [],
    }
    this.provenance = {
      nodes: [{ id: options.runId, type: "run" }],
      edges: [],
    }
    this.saveState()
  }

  get runId(): string {
    return this.options.runId
  }

  recordStep(event: RuntimeStep): void {
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
    this.saveArtifactRaw("provenance.json", this.provenance)
  }

  async operation<T>(options: {
    readonly logger: OperationLoggerLike
    readonly name: string
    readonly actor?: string
    readonly input?: unknown
    readonly detail?: unknown
    readonly parent?: string | null
    readonly run: () => Promise<T>
  }): Promise<T> {
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
    this.saveState()
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
    try {
      const output = await options.run()
      this.updateUnitOfWork(unitOfWork, { status: "completed", completedAt: this.nowIso() })
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
      return output
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause))
      this.updateUnitOfWork(unitOfWork, {
        status: "failed",
        completedAt: this.nowIso(),
        error: error.message,
      })
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
      throw error
    }
  }

  updateUnitOfWork(id: string, patch: Partial<UnitOfWorkState>): void {
    this.state = {
      ...this.state,
      unitOfWorks: this.state.unitOfWorks.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }
    this.saveState()
  }

  saveArtifact(name: string, data: unknown): string {
    const path = this.saveArtifactRaw(name, data)
    this.state = {
      ...this.state,
      artifacts: [...this.state.artifacts, { name, path }],
    }
    this.provenance = {
      nodes: [...this.provenance.nodes, { id: name, type: "artifact", path }],
      edges: [...this.provenance.edges, { from: this.runId, to: name, type: "produced" }],
    }
    this.saveArtifactRaw("provenance.json", this.provenance)
    this.saveState()
    return path
  }

  saveArtifactRaw(name: string, data: unknown): string {
    const path = join(this.runRoot, "artifacts", name)
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2)
    writeFileSync(path, content)
    return path
  }

  saveState(patch: Partial<RunState> = {}): void {
    this.state = { ...this.state, ...patch }
    writeFileSync(join(this.runRoot, "state.json"), JSON.stringify(this.state, null, 2))
  }

  loadState(): RunState {
    return JSON.parse(readFileSync(join(this.runRoot, "state.json"), "utf8")) as RunState
  }

  private nowIso(): string {
    return (this.options.clock?.now() ?? new Date()).toISOString()
  }
}

export function createRunId(prefix = "run", clock: RuntimeClock = { now: () => new Date() }): string {
  return `${prefix}-${clock.now().toISOString().replace(/[:.]/g, "-")}`
}

const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9_.-]/g, "-")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
