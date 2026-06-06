import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { Effect } from "effect"
import {
  NotFound,
  RepositoryError,
  RepositoryTypeId,
  type AggregateRoot,
  type GetId,
  type OperationScope,
  type Repository,
  type RepositoryCodec,
} from "@rta/core"
import { InstrumentedRepository, type OperationSummary } from "@rta/strict"
import { createRuntimeScope } from "./scope.js"

type RepositoryOperation<A extends AggregateRoot<any, any, any>> =
  | { readonly kind: "findById"; readonly id: GetId<A> }
  | { readonly kind: "save"; readonly aggregate: A }
  | { readonly kind: "nextId" }

type RepositoryOperationResult<A extends AggregateRoot<any, any, any>> =
  | { readonly kind: "found"; readonly aggregate: A }
  | { readonly kind: "saved" }
  | { readonly kind: "nextId"; readonly id: GetId<A> }

interface VersionedRepositoryEnvelope {
  readonly schemaVersion: 1
  readonly payload: unknown
}

export interface RuntimeRepositoryOptions<A extends AggregateRoot<any, any, any>> {
  readonly entityType: string
  readonly context?: string
  readonly scope?: OperationScope
  readonly idPrefix?: string
  readonly idFactory?: () => GetId<A>
}

abstract class RuntimeRepository<A extends AggregateRoot<any, any, any>>
  extends InstrumentedRepository<
    RepositoryOperation<A>,
    RepositoryOperationResult<A>,
    NotFound | RepositoryError
  >
  implements Repository<A> {
  readonly [RepositoryTypeId]: typeof RepositoryTypeId = RepositoryTypeId
  private counter = 0
  protected readonly scope: OperationScope

  protected constructor(protected readonly options: RuntimeRepositoryOptions<A>) {
    super(`${options.entityType}Repository`, options.context ?? "Runtime")
    this.scope = options.scope ?? createRuntimeScope(`${options.entityType}Repository`)
  }

  findById(id: GetId<A>): Effect.Effect<A, NotFound | RepositoryError> {
    return this.invoke({ kind: "findById", id }, this.scope).pipe(
      Effect.flatMap((result) =>
        result.kind === "found"
          ? Effect.succeed(result.aggregate)
          : Effect.fail(new RepositoryError({
            message: "repository returned an invalid find result",
            cause: result,
          })),
      ),
    )
  }

  save(aggregate: A): Effect.Effect<void, RepositoryError> {
    return this.invoke({ kind: "save", aggregate }, this.scope).pipe(
      Effect.map(() => undefined),
      Effect.mapError((error) =>
        error._tag === "RepositoryError"
          ? error
          : new RepositoryError({ message: "unexpected save failure", cause: error }),
      ),
    )
  }

  nextId(): Effect.Effect<GetId<A>, RepositoryError> {
    return this.invoke({ kind: "nextId" }, this.scope).pipe(
      Effect.flatMap((result) =>
        result.kind === "nextId"
          ? Effect.succeed(result.id)
          : Effect.fail(new RepositoryError({
            message: "repository returned an invalid nextId result",
            cause: result,
          })),
      ),
      Effect.mapError((error) =>
        error._tag === "RepositoryError"
          ? error
          : new RepositoryError({ message: "unexpected nextId failure", cause: error }),
      ),
    )
  }

  protected summarize(input: RepositoryOperation<A>): OperationSummary {
    const entityType = this.options.entityType
    if (input.kind === "findById") {
      return {
        action: `Read ${entityType}`,
        reason: "application code requested an aggregate by id",
        with: [this.primitiveName],
        input: String(input.id),
        output: "aggregate or not-found",
        lineage: ["primitive:repository", `aggregate:${entityType}`],
        boundary: {
          system: this.primitiveName,
          operation: "findById",
          mode: "read",
        },
      }
    }
    if (input.kind === "save") {
      return {
        action: `Save ${entityType}`,
        reason: "application code changed aggregate state",
        with: [this.primitiveName],
        input: String(input.aggregate.id),
        output: "aggregate persisted",
        lineage: ["primitive:repository", `aggregate:${entityType}`],
        boundary: {
          system: this.primitiveName,
          operation: "save",
          mode: "committed",
        },
      }
    }
    return {
      action: `Allocate ${entityType} id`,
      reason: "application code requested a repository-scoped identity",
      with: [this.primitiveName],
      output: "new aggregate id",
      lineage: ["primitive:repository", `aggregate:${entityType}`],
    }
  }

  protected execute(input: RepositoryOperation<A>): Effect.Effect<
    RepositoryOperationResult<A>,
    NotFound | RepositoryError
  > {
    switch (input.kind) {
      case "findById":
        return this.findByIdImpl(input.id).pipe(
          Effect.map((aggregate) => ({ kind: "found" as const, aggregate })),
        )
      case "save":
        return this.saveImpl(input.aggregate).pipe(
          Effect.map(() => ({ kind: "saved" as const })),
        )
      case "nextId":
        return this.nextIdImpl().pipe(
          Effect.map((id) => ({ kind: "nextId" as const, id })),
        )
    }
  }

  protected nextIdImpl(): Effect.Effect<GetId<A>, RepositoryError> {
    return Effect.sync(() => {
      if (this.options.idFactory) return this.options.idFactory()
      const prefix = this.options.idPrefix ?? this.options.entityType.toLowerCase()
      this.counter += 1
      return `${prefix}-${this.counter}` as GetId<A>
    })
  }

  protected abstract findByIdImpl(id: GetId<A>): Effect.Effect<A, NotFound | RepositoryError>
  protected abstract saveImpl(aggregate: A): Effect.Effect<void, RepositoryError>
}

export class InMemoryRepository<A extends AggregateRoot<any, any, any>>
  extends RuntimeRepository<A> {
  private readonly store: Map<string, A>

  constructor(options: RuntimeRepositoryOptions<A> & {
    readonly initial?: ReadonlyArray<A>
    readonly store?: Map<string, A>
  }) {
    super(options)
    this.store = options.store ?? new Map<string, A>()
    for (const aggregate of options.initial ?? []) {
      this.store.set(String(aggregate.id), aggregate)
    }
  }

  snapshot(): ReadonlyArray<A> {
    return [...this.store.values()]
  }

  protected findByIdImpl(id: GetId<A>): Effect.Effect<A, NotFound> {
    const aggregate = this.store.get(String(id))
    return aggregate
      ? Effect.succeed(aggregate)
      : Effect.fail(new NotFound({ entityType: this.options.entityType, id }))
  }

  protected saveImpl(aggregate: A): Effect.Effect<void> {
    return Effect.sync(() => {
      this.store.set(String(aggregate.id), aggregate)
    })
  }
}

export class FileBackedRepository<A extends AggregateRoot<any, any, any>>
  extends RuntimeRepository<A> {
  constructor(private readonly fileOptions: RuntimeRepositoryOptions<A> & {
    readonly root: string
    readonly codec: RepositoryCodec<A>
  }) {
    super(fileOptions)
  }

  protected findByIdImpl(id: GetId<A>): Effect.Effect<A, NotFound | RepositoryError> {
    return Effect.tryPromise({
      try: async () => JSON.parse(await readFile(this.pathFor(id), "utf8")) as unknown,
      catch: (cause) => {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        return error && "code" in error && error.code === "ENOENT"
          ? new NotFound({ entityType: this.options.entityType, id })
          : new RepositoryError({ message: "failed to read aggregate file", cause })
      },
    }).pipe(
      Effect.flatMap((raw) => this.fileOptions.codec.decode(unwrapEnvelope(raw))),
    )
  }

  protected saveImpl(aggregate: A): Effect.Effect<void, RepositoryError> {
    return Effect.tryPromise({
      try: async () => {
        const path = this.pathFor(aggregate.id)
        const tempPath = `${path}.${randomUUID()}.tmp`
        await mkdir(dirname(path), { recursive: true })
        await writeFile(tempPath, JSON.stringify(wrapEnvelope(this.fileOptions.codec.encode(aggregate)), null, 2), "utf8")
        await rename(tempPath, path)
      },
      catch: (cause) => new RepositoryError({ message: "failed to write aggregate file", cause }),
    })
  }

  protected override nextIdImpl(): Effect.Effect<GetId<A>, RepositoryError> {
    return Effect.sync(() => {
      if (this.fileOptions.idFactory) return this.fileOptions.idFactory()
      const prefix = this.fileOptions.idPrefix ?? this.fileOptions.entityType.toLowerCase()
      return `${prefix}-${randomUUID()}` as GetId<A>
    })
  }

  private pathFor(id: GetId<A>): string {
    return join(this.fileOptions.root, ".rta", "repositories", this.fileOptions.entityType, `${String(id)}.json`)
  }
}

const isVersionedEnvelope = (value: unknown): value is VersionedRepositoryEnvelope =>
  typeof value === "object" &&
  value !== null &&
  "schemaVersion" in value &&
  (value as { readonly schemaVersion?: unknown }).schemaVersion === 1 &&
  "payload" in value

const wrapEnvelope = (payload: unknown): VersionedRepositoryEnvelope => ({
  schemaVersion: 1,
  payload,
})

const unwrapEnvelope = (value: unknown): unknown =>
  isVersionedEnvelope(value) ? value.payload : value
