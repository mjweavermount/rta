import { Effect } from "effect"
import { DomainError } from "./errors.js"

export type TrustLevel = "external" | "internal" | "command" | "system"

export interface Reason {
  readonly message: string
  readonly code?: string
}

export interface Identity {
  readonly actorId: string
  readonly displayName?: string
}

export interface ClockPort {
  readonly now: () => Date
}

export interface RandomPort {
  readonly uuid: () => string
}

export const SystemClock: ClockPort = {
  now: () => new Date(),
}

export const SystemRandom: RandomPort = {
  uuid: () => crypto.randomUUID(),
}

export class SimulatedClock implements ClockPort {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current)
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms)
  }
}

export class SimulatedRandom implements RandomPort {
  private index = 0

  constructor(private readonly values: ReadonlyArray<string>) {}

  uuid(): string {
    const value = this.values[this.index]
    if (value === undefined) {
      throw new Error("SimulatedRandom exhausted")
    }
    this.index += 1
    return value
  }
}

export abstract class Capability {
  private readonly capabilityBrand = true

  protected constructor(readonly name: string) {}
}

export class PolicyToken extends Capability {
  private constructor(readonly policy: string, readonly reason: Reason) {
    super("PolicyToken")
  }

  static mint(policy: string, reason: Reason): PolicyToken {
    requireReason(reason)
    return new PolicyToken(policy, reason)
  }
}

export class CommitCap extends Capability {
  private constructor() {
    super("CommitCap")
  }

  static mint(): CommitCap {
    return new CommitCap()
  }
}

export class RawQueryCap extends Capability {
  private constructor() {
    super("RawQueryCap")
  }

  static mint(): RawQueryCap {
    return new RawQueryCap()
  }
}

export class CapabilityBag {
  private readonly values = new Map<Function, Capability>()

  add<T extends Capability>(capability: T): CapabilityBag {
    const next = new CapabilityBag()
    for (const value of this.values.values()) {
      next.values.set(value.constructor, value)
    }
    next.values.set(capability.constructor, capability)
    return next
  }

  has<T extends Capability>(kind: CapabilityKind<T>): boolean {
    return this.values.has(kind)
  }

  require<T extends Capability>(kind: CapabilityKind<T>): Effect.Effect<T, DomainError> {
    const value = this.values.get(kind)
    return value instanceof kind
      ? Effect.succeed(value as T)
      : Effect.fail(new DomainError({
        message: `Missing capability: ${kind.name}`,
        context: { capability: kind.name },
      }))
  }
}

export type CapabilityKind<T extends Capability> = Function & {
  readonly prototype: T
}

export interface UnitOfWork {
  readonly commit: (capability: CommitCap, reason: Reason) => Effect.Effect<void, DomainError>
  readonly stageEvent?: (event: unknown, reason: Reason) => Effect.Effect<void, DomainError>
}

export interface OperationScopeOptions {
  readonly operationId: string
  readonly traceId: string
  readonly spanId: string
  readonly trustLevel: TrustLevel
  readonly identity: Identity
  readonly capabilities?: CapabilityBag
  readonly unitOfWork?: UnitOfWork
  readonly clock?: ClockPort
  readonly random?: RandomPort
}

export class OperationScope {
  readonly operationId: string
  readonly traceId: string
  readonly spanId: string
  readonly trustLevel: TrustLevel
  readonly identity: Identity
  readonly capabilities: CapabilityBag
  readonly unitOfWork?: UnitOfWork
  readonly clock: ClockPort
  readonly random: RandomPort

  constructor(options: OperationScopeOptions) {
    this.operationId = options.operationId
    this.traceId = options.traceId
    this.spanId = options.spanId
    this.trustLevel = options.trustLevel
    this.identity = options.identity
    this.capabilities = options.capabilities ?? new CapabilityBag()
    this.unitOfWork = options.unitOfWork
    this.clock = options.clock ?? SystemClock
    this.random = options.random ?? SystemRandom
  }

  fork(name: string): OperationScope {
    return new OperationScope({
      operationId: `${this.operationId}/${name}`,
      traceId: this.traceId,
      spanId: this.random.uuid(),
      trustLevel: this.trustLevel,
      identity: this.identity,
      capabilities: this.capabilities,
      unitOfWork: this.unitOfWork,
      clock: this.clock,
      random: this.random,
    })
  }

  promote(target: TrustLevel, reason: Reason): OperationScope {
    requireReason(reason)
    if (!canPromote(this.trustLevel, target)) {
      throw new DomainError({
        message: `Illegal trust promotion: ${this.trustLevel} -> ${target}`,
        context: { from: this.trustLevel, to: target, reason },
      })
    }

    const capabilities = target === "command"
      ? this.capabilities.add(CommitCap.mint())
      : target === "system"
        ? this.capabilities.add(CommitCap.mint()).add(RawQueryCap.mint())
        : this.capabilities

    return new OperationScope({
      operationId: this.operationId,
      traceId: this.traceId,
      spanId: this.spanId,
      trustLevel: target,
      identity: this.identity,
      capabilities,
      unitOfWork: this.unitOfWork,
      clock: this.clock,
      random: this.random,
    })
  }

  withUnitOfWork(unitOfWork: UnitOfWork): OperationScope {
    return new OperationScope({
      operationId: this.operationId,
      traceId: this.traceId,
      spanId: this.spanId,
      trustLevel: this.trustLevel,
      identity: this.identity,
      capabilities: this.capabilities,
      unitOfWork,
      clock: this.clock,
      random: this.random,
    })
  }

  authorize(policy: string, reason: Reason): PolicyToken {
    return PolicyToken.mint(policy, reason)
  }

  requireCommit(): Effect.Effect<CommitCap, DomainError> {
    return this.capabilities.require(CommitCap)
  }
}

export class ContextFactory {
  constructor(
    private readonly clock: ClockPort = SystemClock,
    private readonly random: RandomPort = SystemRandom,
  ) {}

  createExternal(identity: Identity): OperationScope {
    const id = this.random.uuid()
    return new OperationScope({
      operationId: id,
      traceId: id,
      spanId: this.random.uuid(),
      trustLevel: "external",
      identity,
      clock: this.clock,
      random: this.random,
    })
  }
}

export const requireReason = (reason: Reason): void => {
  if (reason.message.trim().length === 0) {
    throw new DomainError({ message: "Reason is required for governed execution" })
  }
}

const trustOrder: Record<TrustLevel, number> = {
  external: 0,
  internal: 1,
  command: 2,
  system: 3,
}

const canPromote = (from: TrustLevel, to: TrustLevel): boolean =>
  trustOrder[to] >= trustOrder[from]
