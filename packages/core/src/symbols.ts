/**
 * Runtime Symbol.for(...) values. Type imports use underscore aliases to
 * avoid the identifier collision between `import type { X }` and `export const X`.
 */

import type {
  AggregateRootTypeId as _AggregateRootTypeId,
  CommandHandlerTypeId as _CommandHandlerTypeId,
  CommandTypeId as _CommandTypeId,
  DecisionTypeId as _DecisionTypeId,
  DomainEventTypeId as _DomainEventTypeId,
  DomainServiceTypeId as _DomainServiceTypeId,
  EntityTypeId as _EntityTypeId,
  EventHandlerTypeId as _EventHandlerTypeId,
  ProcessManagerTypeId as _ProcessManagerTypeId,
  QueryHandlerTypeId as _QueryHandlerTypeId,
  QueryTypeId as _QueryTypeId,
  ReactionTypeId as _ReactionTypeId,
  RepositoryTypeId as _RepositoryTypeId,
  RuleTypeId as _RuleTypeId,
  ValueObjectTypeId as _ValueObjectTypeId,
} from "./typeids.js"

const sym = <T extends symbol>(key: string): T => Symbol.for(key) as unknown as T

export const ValueObjectTypeId: _ValueObjectTypeId = sym("@rta/core/ValueObject")
export const EntityTypeId: _EntityTypeId = sym("@rta/core/Entity")
export const AggregateRootTypeId: _AggregateRootTypeId = sym("@rta/core/AggregateRoot")
export const CommandTypeId: _CommandTypeId = sym("@rta/core/Command")
export const DomainEventTypeId: _DomainEventTypeId = sym("@rta/core/DomainEvent")
export const QueryTypeId: _QueryTypeId = sym("@rta/core/Query")
export const CommandHandlerTypeId: _CommandHandlerTypeId = sym("@rta/core/CommandHandler")
export const QueryHandlerTypeId: _QueryHandlerTypeId = sym("@rta/core/QueryHandler")
export const EventHandlerTypeId: _EventHandlerTypeId = sym("@rta/core/EventHandler")
export const RepositoryTypeId: _RepositoryTypeId = sym("@rta/core/Repository")
export const DomainServiceTypeId: _DomainServiceTypeId = sym("@rta/core/DomainService")
export const RuleTypeId: _RuleTypeId = sym("@rta/core/Rule")
export const DecisionTypeId: _DecisionTypeId = sym("@rta/core/Decision")
export const ReactionTypeId: _ReactionTypeId = sym("@rta/core/Reaction")
export const ProcessManagerTypeId: _ProcessManagerTypeId = sym("@rta/core/ProcessManager")

// Reserved primitive slot for future rehydration:
// export const ProjectorTypeId: _ProjectorTypeId = sym("@rta/core/Projector")
