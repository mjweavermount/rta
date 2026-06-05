import { Effect } from "effect"
import type { Command } from "./command.js"
import type { DomainEvent } from "./domain-event.js"
import { DomainError } from "./errors.js"
import type { OperationScope } from "./operation-scope.js"
import type { Query, QueryResult } from "./query.js"

export interface ScopedCommandHandler<C extends Command<string, any>, E = DomainError, R = never> {
  readonly handle: (command: C, scope: OperationScope) => Effect.Effect<void, E, R>
}

export interface ScopedQueryHandler<Q extends Query<string, any, any>, E = DomainError, R = never> {
  readonly handle: (query: Q, scope: OperationScope) => Effect.Effect<QueryResult<Q>, E, R>
}

export interface ScopedEventHandler<Ev extends DomainEvent<string, any>, E = DomainError, R = never> {
  readonly handle: (event: Ev, scope: OperationScope) => Effect.Effect<void, E, R>
}

export class HandlerNotRegistered extends DomainError {
  constructor(readonly messageTag: string, readonly kind: "command" | "query" | "event") {
    super({
      message: `${kind} handler not registered for ${messageTag}`,
      context: { messageTag, kind },
    })
  }
}

export class CommandBus {
  private readonly handlers = new Map<string, ScopedCommandHandler<Command<string, any>, unknown, unknown>>()

  register<C extends Command<string, any>, E, R>(
    messageTag: C["_tag"],
    handler: ScopedCommandHandler<C, E, R>,
  ): CommandBus {
    this.handlers.set(messageTag, handler as ScopedCommandHandler<Command<string, any>, unknown, unknown>)
    return this
  }

  dispatch<C extends Command<string, any>>(
    command: C,
    scope: OperationScope,
  ): Effect.Effect<void, unknown, unknown> {
    const handler = this.handlers.get(command._tag)
    return handler === undefined
      ? Effect.fail(new HandlerNotRegistered(command._tag, "command"))
      : handler.handle(command, scope)
  }
}

export class QueryBus {
  private readonly handlers = new Map<string, ScopedQueryHandler<Query<string, any, any>, unknown, unknown>>()

  register<Q extends Query<string, any, any>, E, R>(
    messageTag: Q["_tag"],
    handler: ScopedQueryHandler<Q, E, R>,
  ): QueryBus {
    this.handlers.set(messageTag, handler as ScopedQueryHandler<Query<string, any, any>, unknown, unknown>)
    return this
  }

  dispatch<Q extends Query<string, any, any>>(
    query: Q,
    scope: OperationScope,
  ): Effect.Effect<QueryResult<Q>, unknown, unknown> {
    const handler = this.handlers.get(query._tag)
    return handler === undefined
      ? Effect.fail(new HandlerNotRegistered(query._tag, "query"))
      : handler.handle(query, scope) as Effect.Effect<QueryResult<Q>, unknown, unknown>
  }
}

export class EventBus {
  private readonly handlers = new Map<string, ScopedEventHandler<DomainEvent<string, any>, unknown, unknown>[]>()

  register<Ev extends DomainEvent<string, any>, E, R>(
    messageTag: Ev["_tag"],
    handler: ScopedEventHandler<Ev, E, R>,
  ): EventBus {
    const current = this.handlers.get(messageTag) ?? []
    current.push(handler as ScopedEventHandler<DomainEvent<string, any>, unknown, unknown>)
    this.handlers.set(messageTag, current)
    return this
  }

  publish<Ev extends DomainEvent<string, any>>(
    event: Ev,
    scope: OperationScope,
  ): Effect.Effect<void, unknown, unknown> {
    const handlers = this.handlers.get(event._tag) ?? []
    if (handlers.length === 0) {
      return Effect.fail(new HandlerNotRegistered(event._tag, "event"))
    }
    return Effect.forEach(handlers, (handler) => handler.handle(event, scope), {
      discard: true,
    })
  }
}
