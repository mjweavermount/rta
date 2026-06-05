import type {
  AggregateDeclaration,
  BoundedContextDeclaration,
  ConnectionsDeclaration,
  ReactionDeclaration,
} from "@rta/vocab"
import { mapFieldType } from "./schema-map.js"

// ---------------------------------------------------------------------------
// Generated file contents from a BoundedContextDeclaration
// ---------------------------------------------------------------------------

export interface GeneratedFile {
  readonly filename: string
  readonly content: string
  readonly overwriteExisting?: boolean
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const toPascalCase = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1)

const fieldLines = (
  fields: ReadonlyArray<{ name: string; type: string }> | undefined,
): string => {
  if (!fields || fields.length === 0) return "Schema.Struct({})"
  const props = fields
    .map((f) => `  ${f.name}: ${mapFieldType(f.type)}`)
    .join(",\n")
  return `Schema.Struct({\n${props},\n})`
}

// ---------------------------------------------------------------------------
// Generate commands.ts
// ---------------------------------------------------------------------------

const generateCommands = (
  ctx: BoundedContextDeclaration,
  strict: boolean,
): GeneratedFile => {
  const commands = ctx.aggregates?.flatMap((a) => a.commands ?? []) ?? []
  if (commands.length === 0) {
    return {
      filename: "commands.ts",
      content: `// No commands declared in ${ctx.name}\n`,
    }
  }

  const factory = strict ? "defineStrictCommand" : "defineCommand"
  const importPkg = strict ? "@rta/strict" : "@rta/core"

  const defs = commands.map((cmd) => {
    const name = toPascalCase(cmd.name)
    const payloadSchema = fieldLines(cmd.payload)
    return [
      `export const ${name}Payload = ${payloadSchema}`,
      `export const ${name} = ${factory}("${cmd.name}", ${name}Payload)`,
      `export type ${name}Command = import("effect").Effect.Effect.Success<ReturnType<typeof ${name}["make"]>>`,
    ].join("\n")
  })

  return {
    filename: "commands.ts",
    overwriteExisting: true,
    content: [
      `import { Schema } from "effect"`,
      `import { ${factory} } from "${importPkg}"`,
      ``,
      defs.join("\n\n"),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate events.ts
// ---------------------------------------------------------------------------

const generateEvents = (
  ctx: BoundedContextDeclaration,
  strict: boolean,
): GeneratedFile => {
  const events = ctx.aggregates?.flatMap((a) => a.events ?? []) ?? []
  if (events.length === 0) {
    return {
      filename: "events.ts",
      content: `// No events declared in ${ctx.name}\n`,
    }
  }

  const factory = strict ? "defineStrictDomainEvent" : "defineDomainEvent"
  const importPkg = strict ? "@rta/strict" : "@rta/core"

  const defs = events.map((evt) => {
    const payloadSchema = fieldLines(evt.payload)
    return [
      `export const ${toPascalCase(evt.name)}Payload = ${payloadSchema}`,
      `export const ${toPascalCase(evt.name)} = ${factory}("${evt.name}", ${toPascalCase(evt.name)}Payload)`,
    ].join("\n")
  })

  return {
    filename: "events.ts",
    overwriteExisting: true,
    content: [
      `import { Schema } from "effect"`,
      `import { ${factory} } from "${importPkg}"`,
      ``,
      defs.join("\n\n"),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate queries.ts
// ---------------------------------------------------------------------------

const generateQueries = (
  ctx: BoundedContextDeclaration,
  strict: boolean,
): GeneratedFile => {
  const queries = ctx.queries ?? []
  if (queries.length === 0) {
    return {
      filename: "queries.ts",
      content: `// No queries declared in ${ctx.name}\n`,
    }
  }

  const factory = strict ? "defineStrictQuery" : "defineQuery"
  const importPkg = strict ? "@rta/strict" : "@rta/core"

  const defs = queries.map((q) => {
    const name = toPascalCase(q.name)
    const paramsSchema = fieldLines(q.parameters)
    const returnsSchema = mapFieldType(q.returns)
    return [
      `export const ${name}Params = ${paramsSchema}`,
      `export const ${name} = ${factory}("${q.name}", ${name}Params, ${returnsSchema})`,
      `export type ${name}Query = import("effect").Effect.Effect.Success<ReturnType<typeof ${name}["make"]>>`,
    ].join("\n")
  })

  return {
    filename: "queries.ts",
    overwriteExisting: true,
    content: [
      `import { Schema } from "effect"`,
      `import { ${factory} } from "${importPkg}"`,
      ``,
      defs.join("\n\n"),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate {Aggregate}.ts — aggregate root + id type + state placeholder
// ---------------------------------------------------------------------------

const generateAggregate = (
  agg: AggregateDeclaration,
): GeneratedFile => {
  const name = toPascalCase(agg.name)
  const idName = agg.id.name
  const eventNames = agg.events?.map((e) => toPascalCase(e.name)) ?? []

  // Build event type union import list
  const eventImports = eventNames.length > 0
    ? `import type { ${eventNames.map((e) => `${e}Payload`).join(", ")} } from "./events.js"\n`
    : ""

  // The aggregate event type: we use the inferred type from the factory
  // Since events are created via defineDomainEvent/defineStrictDomainEvent,
  // we can refer to them as Schema.Schema.Type<typeof {Name}Payload> wrapped in a DomainEvent shell.
  // For simplicity we use a looser "any domain event" union here — TODO for consuming teams to tighten.
  const eventTypeComment = eventNames.length > 0
    ? `// Events raised by this aggregate:\n// ${eventNames.join(", ")}\n// TODO: tighten TEvent to the specific union once event types are imported\n`
    : ""

  return {
    filename: `${name}.ts`,
    content: [
      `import { Data } from "effect"`,
      `import { makeAggregateRoot, raiseEvents, type AggregateRoot } from "@rta/core"`,
      eventImports.trim() ? eventImports.trim() : null,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// Identity`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `export type ${idName} = string & { readonly _tag: "${idName}" }`,
      `export const make${idName} = (raw: string): ${idName} => raw as ${idName}`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// State`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `export interface ${name}Data {`,
      `  // TODO: add state fields`,
      `}`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// Aggregate`,
      `// ---------------------------------------------------------------------------`,
      ``,
      eventTypeComment.trim() ? eventTypeComment.trim() : null,
      `// eslint-disable-next-line @typescript-eslint/no-explicit-any`,
      `export type ${name} = AggregateRoot<${idName}, ${name}Data, any>`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// Domain Errors`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `// TODO: define domain errors using Data.TaggedError, e.g.:`,
      `// export class SomeInvalidState extends Data.TaggedError("SomeInvalidState")<{`,
      `//   readonly ${agg.id.name.charAt(0).toLowerCase() + agg.id.name.slice(1)}: string`,
      `// }> {}`,
      `void Data.TaggedError // keep import used`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// Factory`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `export const create${name} = (`,
      `  id: ${idName},`,
      `  data: ${name}Data,`,
      `): ${name} => makeAggregateRoot<${idName}, ${name}Data>(id, data)`,
      ``,
      `export { raiseEvents }`,
      ``,
    ].filter((l) => l !== null).join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate {Aggregate}Repository.ts
// ---------------------------------------------------------------------------

const generateRepository = (
  agg: AggregateDeclaration,
  ctxName: string,
): GeneratedFile => {
  const name = toPascalCase(agg.name)
  const idName = agg.id.name

  return {
    filename: `${name}Repository.ts`,
    content: [
      `import { Context, Effect, Layer } from "effect"`,
      `import { NotFound, RepositoryError } from "@rta/core"`,
      `import { InMemoryRepository } from "@rta/runtime"`,
      `import type { ${name}, ${idName} } from "./${name}.js"`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// ${name}Repository`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `export class ${name}Repository extends Context.Tag("${ctxName}.${name}Repository")<`,
      `  ${name}Repository,`,
      `  {`,
      `    readonly findById: (id: ${idName}) => Effect.Effect<${name}, NotFound | RepositoryError>`,
      `    readonly save: (aggregate: ${name}) => Effect.Effect<void, RepositoryError>`,
      `    readonly nextId: () => Effect.Effect<${idName}, RepositoryError>`,
      `  }`,
      `>() {}`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// In-memory implementation (for tests and local dev)`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `// Exported so the API server can read live state without Effect`,
      `export const _${name.charAt(0).toLowerCase() + name.slice(1)}Store = new Map<string, ${name}>()`,
      ``,
      `export const ${name}RepositoryInMemory = Layer.succeed(`,
      `  ${name}Repository,`,
      `  new InMemoryRepository<${name}>({`,
      `    entityType: "${name}",`,
      `    context: "${ctxName}",`,
      `    idPrefix: "${agg.name.toLowerCase()}",`,
      `    store: _${name.charAt(0).toLowerCase() + name.slice(1)}Store,`,
      `  }),`,
      `)`,
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate {CommandName}Handler.ts — one per command
// ---------------------------------------------------------------------------

const generateCommandHandler = (
  cmdName: string,
  aggName: string,
  strict: boolean,
  ctxName: string,
): GeneratedFile => {
  const cmd = toPascalCase(cmdName)
  const agg = toPascalCase(aggName)
  const handlerName = `handle${cmd}`
  const className = `${cmd}Handler`
  const cmdType = `${cmd}Command`
  const repoService = `${agg}Repository`
  const extraImports = strict
    ? `\nimport { InstrumentedCommandHandler, type OperationSummary } from "@rta/strict"\nimport { OperationScope } from "@rta/core"`
    : ""

  return {
    filename: `${cmd}Handler.ts`,
    overwriteExisting: true,
    content: [
      `import { Effect } from "effect"`,
      `import { NotFound, RepositoryError } from "@rta/core"${extraImports}`,
      `import type { ${cmdType} } from "./commands.js"`,
      `import { ${repoService} } from "./${agg}Repository.js"`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// ${cmd} handler`,
      `// ---------------------------------------------------------------------------`,
      ``,
      ...(strict ? [
        `export class ${className} extends InstrumentedCommandHandler<${cmdType}, NotFound | RepositoryError, ${repoService}> {`,
        `  constructor() {`,
        `    super(${JSON.stringify(className)}, ${JSON.stringify(ctxName)})`,
        `  }`,
        ``,
        `  protected summarizeCommand(command: ${cmdType}): OperationSummary {`,
        `    return {`,
        `      action: ${JSON.stringify(`Handle ${cmdName}`)},`,
        `      reason: ${JSON.stringify(`${cmdName} was routed to the ${ctxName} bounded context`)},`,
        `      with: [${JSON.stringify(repoService)}],`,
        `      input: command._tag,`,
        `      output: "domain events staged by command handler",`,
        `      lineage: [${JSON.stringify(`context:${ctxName}`)}, ${JSON.stringify(`aggregate:${agg}`)}, ${JSON.stringify(`command:${cmdName}`)}],`,
        `    }`,
        `  }`,
        ``,
        `  protected executeCommand(`,
        `    command: ${cmdType},`,
        `    _scope: OperationScope,`,
        `  ): Effect.Effect<void, NotFound | RepositoryError, ${repoService}> {`,
        `    return Effect.gen(function* () {`,
        `      const repo = yield* ${repoService}`,
        `      void repo // TODO: load aggregate with repo.findById(...)`,
        `      void command`,
        `      // TODO: apply business logic, raise events, save`,
        `      // Pattern:`,
        `      //   const agg = yield* repo.findById(command.payload.${agg.toLowerCase()}Id)`,
        `      //   if (agg.data.someState === "invalid") yield* Effect.fail(new SomeDomainError(...))`,
        `      //   const event = yield* SomethingHappened.make({...}, { context: command, aggregateId: agg.id, aggregateType: "${agg}" })`,
        `      //   const updated = raiseEvents(agg, event)`,
        `      //   yield* repo.save(updated)`,
        `    })`,
        `  }`,
        `}`,
        ``,
      ] : []),
      `export const ${handlerName} = (`,
      `  command: ${cmdType},`,
      ...(strict ? [`  scope = new OperationScope({`] : []),
      ...(strict ? [
        `    traceId: command._tag,`,
        `    operationId: command._tag,`,
        `    spanId: command._tag,`,
        `    trustLevel: "command",`,
        `    identity: { actorId: "generated-registry" },`,
        `    clock: { now: () => new Date(0) },`,
        `    random: { uuid: () => command._tag },`,
        `  }),`,
      ] : []),
      `): Effect.Effect<void, NotFound | RepositoryError, ${repoService}> =>`,
      ...(strict ? [
        `  new ${className}().handle(command, scope)`,
      ] : [
        `  Effect.gen(function* () {`,
        `    const repo = yield* ${repoService}`,
        `    void repo // TODO: load aggregate with repo.findById(...)`,
        `    void command`,
        `    // TODO: apply business logic, raise events, save`,
        `    // Pattern:`,
        `    //   const agg = yield* repo.findById(command.payload.${agg.toLowerCase()}Id)`,
        `    //   if (agg.data.someState === "invalid") yield* Effect.fail(new SomeDomainError(...))`,
        `    //   const event = yield* SomethingHappened.make({...}, { context: command, aggregateId: agg.id, aggregateType: "${agg}" })`,
        `    //   const updated = raiseEvents(agg, event)`,
        `    //   yield* repo.save(updated)`,
        `  })`,
      ]),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate {QueryName}Handler.ts — one per query
// ---------------------------------------------------------------------------

const generateQueryHandler = (
  queryName: string,
  returns: string,
  strict: boolean,
  ctxName: string,
): GeneratedFile => {
  const q = toPascalCase(queryName)
  const handlerName = `handle${q}`
  const className = `${q}Handler`
  const qType = `${q}Query`
  const extraImports = strict
    ? `\nimport { InstrumentedQueryHandler, type OperationSummary } from "@rta/strict"\nimport { OperationScope } from "@rta/core"`
    : ""

  return {
    filename: `${q}Handler.ts`,
    overwriteExisting: true,
    content: [
      `import { Effect } from "effect"`,
      `import { NotFound } from "@rta/core"${extraImports}`,
      `import type { ${qType} } from "./queries.js"`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// ${q} handler`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `// TODO: replace unknown with the actual return type (e.g. ${returns}ReadModel)`,
      ...(strict ? [
        `export class ${className} extends InstrumentedQueryHandler<${qType}, NotFound> {`,
        `  constructor() {`,
        `    super(${JSON.stringify(className)}, ${JSON.stringify(ctxName)})`,
        `  }`,
        ``,
        `  protected summarizeQuery(query: ${qType}): OperationSummary {`,
        `    return {`,
        `      action: ${JSON.stringify(`Handle ${queryName}`)},`,
        `      reason: ${JSON.stringify(`${queryName} was routed to the ${ctxName} read side`)},`,
        `      with: ["read model"],`,
        `      input: query._tag,`,
        `      output: "read model response",`,
        `      lineage: [${JSON.stringify(`context:${ctxName}`)}, ${JSON.stringify(`query:${queryName}`)}],`,
        `    }`,
        `  }`,
        ``,
        `  protected executeQuery(`,
        `    query: ${qType},`,
        `    _scope: OperationScope,`,
        `  ): Effect.Effect<unknown, NotFound> {`,
        `    return Effect.gen(function* () {`,
        `      void query`,
        `      // TODO: read from a read model / projection`,
        `      // Pattern:`,
        `      //   return yield* readModelStore.findBy(query.payload.${queryName.charAt(0).toLowerCase() + queryName.slice(1)}Id)`,
        `      return yield* Effect.die("not implemented")`,
        `    })`,
        `  }`,
        `}`,
        ``,
      ] : []),
      `export const ${handlerName} = (`,
      `  query: ${qType},`,
      ...(strict ? [`  scope = new OperationScope({`] : []),
      ...(strict ? [
        `    traceId: query._tag,`,
        `    operationId: query._tag,`,
        `    spanId: query._tag,`,
        `    trustLevel: "internal",`,
        `    identity: { actorId: "generated-registry" },`,
        `    clock: { now: () => new Date(0) },`,
        `    random: { uuid: () => query._tag },`,
        `  }),`,
      ] : []),
      `): Effect.Effect<unknown, NotFound> =>`,
      ...(strict ? [
        `  new ${className}().handle(query, scope)`,
      ] : [
        `  Effect.gen(function* () {`,
        `    void query`,
        `    // TODO: read from a read model / projection`,
        `    // Pattern:`,
        `    //   return yield* readModelStore.findBy(query.payload.${queryName.charAt(0).toLowerCase() + queryName.slice(1)}Id)`,
        `    return yield* Effect.die("not implemented")`,
        `  })`,
      ]),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate {ReactionName}Handler.ts — one per connection reaction
// ---------------------------------------------------------------------------

const generateReactionHandler = (
  reaction: ReactionDeclaration,
  strict: boolean,
  ctxName: string,
): GeneratedFile => {
  const reactionName = toPascalCase(reaction.name)
  const eventType = `${reactionName}Event`
  const handlerName = `handle${reactionName}`
  const className = `${reactionName}Handler`
  const emittedCommands = reaction.emits.map((emit) => `${emit.to}.${emit.command}`)
  const extraImports = strict
    ? `\nimport { InstrumentedEventHandler, type OperationSummary } from "@rta/strict"\nimport { OperationScope } from "@rta/core"`
    : ""

  return {
    filename: `${reactionName}Handler.ts`,
    overwriteExisting: true,
    content: [
      `import { Effect } from "effect"`,
      `import { DomainError, type DomainEvent } from "@rta/core"${extraImports}`,
      ``,
      `// ---------------------------------------------------------------------------`,
      `// ${reactionName} event handler`,
      `// ---------------------------------------------------------------------------`,
      ``,
      `export type ${eventType} = DomainEvent<string, unknown>`,
      ``,
      ...(strict ? [
        `export class ${className} extends InstrumentedEventHandler<${eventType}, DomainError> {`,
        `  constructor() {`,
        `    super(${JSON.stringify(className)}, ${JSON.stringify(ctxName)})`,
        `  }`,
        ``,
        `  protected summarizeEvent(event: ${eventType}): OperationSummary {`,
        `    return {`,
        `      action: ${JSON.stringify(`React to ${reaction.trigger.event}`)},`,
        `      reason: ${JSON.stringify(reaction.description ?? `${reaction.name} routes an incoming event to declared command outputs`)},`,
        `      with: ${JSON.stringify(emittedCommands)},`,
        `      input: event._tag,`,
        `      output: "declared reaction commands evaluated",`,
        `      lineage: [${JSON.stringify(`context:${ctxName}`)}, ${JSON.stringify(`reaction:${reaction.name}`)}, ${JSON.stringify(`trigger:${reaction.trigger.event}`)}],`,
        `    }`,
        `  }`,
        ``,
        `  protected executeEvent(`,
        `    event: ${eventType},`,
        `    _scope: OperationScope,`,
        `  ): Effect.Effect<void, DomainError> {`,
        `    void event`,
        `    // TODO: map the event payload into these declared command outputs:`,
        ...emittedCommands.map((command) => `    // - ${command}`),
        `    // Pattern: yield* commandBus.dispatch(Command.make(...), _scope.fork("${reactionName}"))`,
        `    return Effect.void`,
        `  }`,
        `}`,
        ``,
      ] : []),
      `export const ${handlerName} = (`,
      `  event: ${eventType},`,
      ...(strict ? [`  scope = new OperationScope({`] : []),
      ...(strict ? [
        `    traceId: event._tag,`,
        `    operationId: event._tag,`,
        `    spanId: event._tag,`,
        `    trustLevel: "internal",`,
        `    identity: { actorId: "generated-registry" },`,
        `    clock: { now: () => new Date(0) },`,
        `    random: { uuid: () => event._tag },`,
        `  }),`,
      ] : []),
      `): Effect.Effect<void, DomainError> =>`,
      ...(strict ? [
        `  new ${className}().handle(event, scope)`,
      ] : [
        `  Effect.gen(function* () {`,
        `    void event`,
        `    // TODO: map incoming event to declared command outputs`,
        `  })`,
      ]),
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Generate index.ts barrel — re-exports everything
// ---------------------------------------------------------------------------

const generateIndex = (
  ctx: BoundedContextDeclaration,
  reactions: ReadonlyArray<ReactionDeclaration>,
): GeneratedFile => {
  const aggregates = ctx.aggregates ?? []
  const queries = ctx.queries ?? []

  const aggExports = aggregates.flatMap((agg) => {
    const name = toPascalCase(agg.name)
    const cmdExports = (agg.commands ?? []).map(
      (cmd) => `export * from "./${toPascalCase(cmd.name)}Handler.js"`,
    )
    return [
      `export * from "./${name}.js"`,
      `export * from "./${name}Repository.js"`,
      ...cmdExports,
    ]
  })

  const queryExports = queries.map(
    (q) => `export * from "./${toPascalCase(q.name)}Handler.js"`,
  )
  const reactionExports = reactions.map(
    (reaction) => `export * from "./${toPascalCase(reaction.name)}Handler.js"`,
  )

  return {
    filename: "index.ts",
    overwriteExisting: true,
    content: [
      `export * from "./commands.js"`,
      `export * from "./events.js"`,
      `export * from "./queries.js"`,
      ...aggExports,
      ...queryExports,
      ...reactionExports,
      ``,
    ].join("\n"),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  readonly strict: boolean
  readonly connections?: ConnectionsDeclaration
}

export const generateContext = (
  ctx: BoundedContextDeclaration,
  options: GenerateOptions,
): ReadonlyArray<GeneratedFile> => {
  const aggregates = ctx.aggregates ?? []
  const queries = ctx.queries ?? []
  const reactions = options.connections?.reactions ?? []

  const aggFiles = aggregates.flatMap((agg) => {
    const cmdHandlers = (agg.commands ?? []).map((cmd) =>
      generateCommandHandler(cmd.name, agg.name, options.strict, ctx.name),
    )
    return [
      generateAggregate(agg),
      generateRepository(agg, ctx.name),
      ...cmdHandlers,
    ]
  })

  const queryHandlers = queries.map((q) =>
    generateQueryHandler(q.name, q.returns, options.strict, ctx.name),
  )
  const reactionHandlers = reactions.map((reaction) =>
    generateReactionHandler(reaction, options.strict, ctx.name),
  )

  return [
    generateCommands(ctx, options.strict),
    generateEvents(ctx, options.strict),
    generateQueries(ctx, options.strict),
    ...aggFiles,
    ...queryHandlers,
    ...reactionHandlers,
    generateIndex(ctx, reactions),
  ]
}
