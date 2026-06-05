import { Context, Effect } from "effect"
import type { RepositoryTypeId } from "./typeids.js"
import { RepositoryTypeId as RepoTypeId } from "./symbols.js"
import type { AggregateRoot, GetId } from "./aggregate-root.js"
import type { NotFound, RepositoryError } from "./errors.js"

// ---------------------------------------------------------------------------
// Repository
//
// The only way to load and persist AggregateRoots.
// Generic constraint enforces A must carry AggregateRootTypeId — passing a
// ValueObject or Entity here is a compile error.
//
// nextId() is provided so that ID generation is repository-scoped (the repo
// knows the backing store and can generate appropriate IDs — UUID, ULID, etc.)
// ---------------------------------------------------------------------------

export interface Repository<A extends AggregateRoot<any, any, any>> {
  readonly [RepoTypeId]: RepositoryTypeId
  readonly findById: (id: GetId<A>) => Effect.Effect<A, NotFound | RepositoryError>
  readonly save: (aggregate: A) => Effect.Effect<void, RepositoryError>
  readonly nextId: () => Effect.Effect<GetId<A>, RepositoryError>
}

export interface RepositoryCodec<A extends AggregateRoot<any, any, any>> {
  readonly entityType: string
  readonly encode: (aggregate: A) => unknown
  readonly decode: (stored: unknown) => Effect.Effect<A, RepositoryError>
}

/** Create an Effect Context.Tag for a specific Repository. */
export const makeRepositoryTag = <A extends AggregateRoot<any, any, any>>(id: string) =>
  Context.GenericTag<Repository<A>>(id)
