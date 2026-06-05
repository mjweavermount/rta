/**
 * Ambient unique symbol declarations for every DDD primitive kind.
 *
 * These are TYPE-ONLY — no runtime emission. The actual Symbol.for(...)
 * runtime values live in symbols.ts, typed as these unique symbol types.
 *
 * The `declare const X: unique symbol` pattern (used by Effect itself) gives
 * each TypeId a nominal type that cannot be accidentally satisfied by any
 * other symbol. This makes illegal compositions a compile error:
 *
 *   Repository<MyValueObject>   // ✗ — ValueObject lacks AggregateRootTypeId
 *   CommandHandler<MyAggregate> // ✗ — Aggregate lacks CommandTypeId
 */

// ---------------------------------------------------------------------------
// Domain primitives
// ---------------------------------------------------------------------------

export declare const ValueObjectTypeId: unique symbol
export type ValueObjectTypeId = typeof ValueObjectTypeId

export declare const EntityTypeId: unique symbol
export type EntityTypeId = typeof EntityTypeId

export declare const AggregateRootTypeId: unique symbol
export type AggregateRootTypeId = typeof AggregateRootTypeId

// ---------------------------------------------------------------------------
// Messages (CQRS)
// ---------------------------------------------------------------------------

export declare const CommandTypeId: unique symbol
export type CommandTypeId = typeof CommandTypeId

export declare const DomainEventTypeId: unique symbol
export type DomainEventTypeId = typeof DomainEventTypeId

export declare const QueryTypeId: unique symbol
export type QueryTypeId = typeof QueryTypeId

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export declare const CommandHandlerTypeId: unique symbol
export type CommandHandlerTypeId = typeof CommandHandlerTypeId

export declare const QueryHandlerTypeId: unique symbol
export type QueryHandlerTypeId = typeof QueryHandlerTypeId

export declare const EventHandlerTypeId: unique symbol
export type EventHandlerTypeId = typeof EventHandlerTypeId

// ---------------------------------------------------------------------------
// Infrastructure interfaces
// ---------------------------------------------------------------------------

export declare const RepositoryTypeId: unique symbol
export type RepositoryTypeId = typeof RepositoryTypeId

export declare const DomainServiceTypeId: unique symbol
export type DomainServiceTypeId = typeof DomainServiceTypeId

// ---------------------------------------------------------------------------
// Domain logic primitives
// ---------------------------------------------------------------------------

export declare const RuleTypeId: unique symbol
export type RuleTypeId = typeof RuleTypeId

export declare const DecisionTypeId: unique symbol
export type DecisionTypeId = typeof DecisionTypeId

export declare const ReactionTypeId: unique symbol
export type ReactionTypeId = typeof ReactionTypeId

export declare const ProcessManagerTypeId: unique symbol
export type ProcessManagerTypeId = typeof ProcessManagerTypeId

// Reserved primitive slot:
// `Projector` looks like a plausible first-class primitive for derived views
// over domain or execution events, but it is intentionally not promoted until
// its boundary against Reaction / ReadModel / ProcessManager is settled.
//
// Rehydrate here first when that work starts:
// export declare const ProjectorTypeId: unique symbol
// export type ProjectorTypeId = typeof ProjectorTypeId
