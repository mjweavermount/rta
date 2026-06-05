import { Context, Effect } from "effect"
import type { CommandHandlerTypeId, EventHandlerTypeId, QueryHandlerTypeId } from "./typeids.js"
import {
  CommandHandlerTypeId as CHTypeId,
  EventHandlerTypeId as EHTypeId,
  QueryHandlerTypeId as QHTypeId,
} from "./symbols.js"
import type { Command } from "./command.js"
import type { DomainEvent } from "./domain-event.js"
import type { Query, QueryResult } from "./query.js"
import type { DomainError } from "./errors.js"

// ---------------------------------------------------------------------------
// CommandHandler
//
// Handles exactly one Command type. Returns void — hella strict CQRS.
// Results surface via domain events on the aggregate, not via return values.
// ---------------------------------------------------------------------------

export interface CommandHandler<C extends Command<string, any>> {
  readonly [CHTypeId]: CommandHandlerTypeId
  readonly handle: (command: C) => Effect.Effect<void, DomainError>
}

export const makeCommandHandlerTag = <C extends Command<string, any>>(id: string) =>
  Context.GenericTag<CommandHandler<C>>(id)

// ---------------------------------------------------------------------------
// QueryHandler
//
// Handles exactly one Query type. Returns the phantom result type.
// Must never touch the write model.
// ---------------------------------------------------------------------------

export interface QueryHandler<Q extends Query<string, any, any>> {
  readonly [QHTypeId]: QueryHandlerTypeId
  readonly handle: (query: Q) => Effect.Effect<QueryResult<Q>, DomainError>
}

export const makeQueryHandlerTag = <Q extends Query<string, any, any>>(id: string) =>
  Context.GenericTag<QueryHandler<Q>>(id)

// ---------------------------------------------------------------------------
// EventHandler
//
// Reacts to a domain event. Returns void — side effects only.
// Used for projections, sagas, notifications, etc.
// ---------------------------------------------------------------------------

export interface EventHandler<E extends DomainEvent<string, any>> {
  readonly [EHTypeId]: EventHandlerTypeId
  readonly handle: (event: E) => Effect.Effect<void, DomainError>
}

export const makeEventHandlerTag = <E extends DomainEvent<string, any>>(id: string) =>
  Context.GenericTag<EventHandler<E>>(id)

