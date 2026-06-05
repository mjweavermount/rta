// TypeId types (unique symbol types — import with `import type`)
export type {
  AggregateRootTypeId,
  CommandHandlerTypeId,
  CommandTypeId,
  DecisionTypeId,
  DomainEventTypeId,
  DomainServiceTypeId,
  EntityTypeId,
  EventHandlerTypeId,
  ProcessManagerTypeId,
  QueryHandlerTypeId,
  QueryTypeId,
  ReactionTypeId,
  RepositoryTypeId,
  RuleTypeId,
  ValueObjectTypeId,
} from "./typeids.js"

// Runtime symbols (needed as property keys and for type guards)
export * from "./symbols.js"

// Errors
export * from "./errors.js"

// Domain primitives
export * from "./value-object.js"
export * from "./entity.js"
export * from "./aggregate-root.js"

// Messages (CQRS)
export * from "./command.js"
export * from "./domain-event.js"
export * from "./query.js"

// Handlers + Repository
export * from "./handlers.js"
export * from "./repository.js"

// Domain logic primitives
export * from "./rule.js"
export * from "./decision.js"
export * from "./reaction.js"
export * from "./process-manager.js"

// Governed execution
export * from "./operation-scope.js"
export * from "./bus.js"

// Reserved primitive slot:
// `Projector` is a likely future primitive once its semantic boundary is
// locked. Rehydrate from typeids.ts / symbols.ts first, then export here.
