/**
 * Compile-time correctness proof for the TypeId hierarchy.
 *
 * This file contains NO runtime code. It exists solely to make tsc fail if
 * the type-level constraints are broken. Every `@ts-expect-error` line
 * documents an illegal composition that MUST remain a compile error.
 *
 * Run: pnpm --filter @rta/core typecheck
 */

import type { AggregateRoot } from "./aggregate-root.js"
import type { Command } from "./command.js"
import type { DomainEvent } from "./domain-event.js"
import type { CommandHandler, EventHandler, QueryHandler } from "./handlers.js"
import type { Query } from "./query.js"
import type { Repository } from "./repository.js"
import type { ValueObject } from "./value-object.js"
import type { Entity } from "./entity.js"

// ---------------------------------------------------------------------------
// Fixture types (no runtime values needed — `declare` is enough)
// ---------------------------------------------------------------------------

declare const orderPlaced: DomainEvent<"OrderPlaced", { orderId: string }>
declare const placeOrder: Command<"PlaceOrder", { customerId: string }>
declare const getOrder: Query<"GetOrder", { id: string }, { id: string; status: string }>

type OrderData = { status: string }
type OrderEvent = DomainEvent<"OrderPlaced", { orderId: string }>
declare const order: AggregateRoot<string, OrderData, OrderEvent>

type MoneyData = { amount: number; currency: string }
declare const money: ValueObject<MoneyData>

type OrderItemData = { productId: string; qty: number }
declare const orderItem: Entity<string, OrderItemData>

// ---------------------------------------------------------------------------
// Correct compositions — these MUST compile
// ---------------------------------------------------------------------------

type _GoodRepo = Repository<typeof order>
type _GoodCmdHandler = CommandHandler<typeof placeOrder>
type _GoodQueryHandler = QueryHandler<typeof getOrder>
type _GoodEventHandler = EventHandler<typeof orderPlaced>

// AggregateRoot satisfies Entity constraint (it IS-AN Entity)
import type { EntityTypeId } from "./typeids.js"
type _AggregateIsEntity = typeof order extends { readonly [K in EntityTypeId]: EntityTypeId }
  ? true
  : false
type _AssertAggregateIsEntity = _AggregateIsEntity extends true ? true : never
const _check: _AssertAggregateIsEntity = true as const

// ---------------------------------------------------------------------------
// Illegal compositions — every line below MUST remain a compile error
// ---------------------------------------------------------------------------

// @ts-expect-error — ValueObject is not an AggregateRoot (missing AggregateRootTypeId)
type _BadRepo_VO = Repository<typeof money>

// @ts-expect-error — Entity is not an AggregateRoot
type _BadRepo_Entity = Repository<typeof orderItem>

// @ts-expect-error — Command is not an AggregateRoot
type _BadRepo_Cmd = Repository<typeof placeOrder>

// @ts-expect-error — DomainEvent is not a Command
type _BadCmdHandler_Event = CommandHandler<typeof orderPlaced>

// @ts-expect-error — Query is not a Command
type _BadCmdHandler_Query = CommandHandler<typeof getOrder>

// @ts-expect-error — AggregateRoot is not a Command
type _BadCmdHandler_AR = CommandHandler<typeof order>

// @ts-expect-error — Command is not a Query
type _BadQueryHandler_Cmd = QueryHandler<typeof placeOrder>

// @ts-expect-error — DomainEvent is not a Query
type _BadQueryHandler_Event = QueryHandler<typeof orderPlaced>

// @ts-expect-error — Command is not a DomainEvent
type _BadEventHandler_Cmd = EventHandler<typeof placeOrder>

// @ts-expect-error — Query is not a DomainEvent
type _BadEventHandler_Query = EventHandler<typeof getOrder>
