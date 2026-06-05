import { Effect } from "effect"
import { mkdir, writeFile, access } from "node:fs/promises"
import { join, resolve } from "node:path"

// ---------------------------------------------------------------------------
// AGENTS.md template
//
// Agent-agnostic. Works with Claude Code, Cursor, Copilot, Aider, etc.
// Consuming project runs `rta init` once; the file is checked into the repo.
// ---------------------------------------------------------------------------

const AGENTS_MD = `\
# Ṛta — AI Agent Guide

This project uses **Ṛta**, an EffectTS DDD framework. Read this before writing code.

Default architecture assumption: this app is a modular monolith. Bounded
contexts are modeling boundaries inside one system unless the project
explicitly introduces separate deployables.

## Core workflow

1. **Vocab first** — define bounded contexts, aggregates, commands, and events in YAML before writing TypeScript handlers.
2. **Check what exists** — run \`rta context\` to see all contexts, aggregates, commands, events, and connections currently defined.
3. **Validate architecture** — run \`rta check\` to see ARD (Architectural Requirement Definition) pass/fail status.
4. **Scaffold TypeScript** — run \`rta generate --strict\` to generate Schema-backed constructors with correlation IDs and OTEL.

## Before writing any handler

Run \`rta context\` and verify the aggregate, command, and events you need are defined. If they are not, add them to the appropriate \`.context.yaml\` first. Code generation and handler wiring depend on vocab completeness.

When discussing architecture, prefer \`bounded context\` or \`module\` over
\`domain\` for slices like \`Billing\`, \`Identity\`, or \`Operations\`.

## Architectural rules (non-negotiable)

- **Commands are fire-and-forget.** They return \`void\` only. Results come back via domain events — never via command return values.
- **QueryHandler cannot receive a Command.** Enforced at the type level; you will get a compile error.
- **Read models are never written by command handlers.**
- **Connection routing is whitelisted.** An event may only flow to contexts declared in the connections YAML.

## File layout

\`\`\`
vocab/
  contexts/<name>.context.yaml       what EXISTS in a bounded context
  connections/<name>.connections.yaml  what is PERMITTED to flow
ards/
  <id>.ard.yaml                      architectural checks
\`\`\`

## Context file format

\`\`\`yaml
kind: BoundedContext
name: OrderManagement
classification: core-domain   # core-domain | supporting | generic | external

aggregates:
  - name: Order
    id: { name: OrderId, backing: UUID }   # UUID | ULID | String | Int
    commands:
      - name: PlaceOrder
        payload:
          - { name: customerId, type: String }
        emits: [OrderPlaced]
    events:
      - name: OrderPlaced
        payload:
          - { name: orderId, type: String }

queries:
  - name: GetOrder
    parameters: [{ name: orderId, type: String }]
    returns: OrderReadModel
\`\`\`

\`classification\` describes the context's subdomain role. It does not imply a
separate service or separate database.

## Connections file format

\`\`\`yaml
kind: Connections
context: OrderManagement

publishes:
  - { event: OrderPlaced, to: [ShippingContext, InventoryContext] }

subscribes:
  - { event: PaymentConfirmed, from: PaymentContext }
\`\`\`

## ARD file format

\`\`\`yaml
id: MY-ARD-001
kind: letter
family: custom
name: "CQRS Boundary"
spirit: [MY-ARD-000]
severity: error   # error | warn
checks:
  - description: "TypeScript compiles without CQRS violations"
    command: "pnpm typecheck"
\`\`\`

## Key commands

\`\`\`
rta context           Print all defined contexts, aggregates, events, queries, connections
rta check             Run all ARD checks, report pass/fail
rta generate --strict Scaffold TypeScript from all .context.yaml files
\`\`\`
`

// ---------------------------------------------------------------------------
// Scaffold templates
// ---------------------------------------------------------------------------

const EXAMPLE_CONTEXT = `\
kind: BoundedContext
name: Example
classification: core-domain

aggregates:
  - name: ExampleAggregate
    id: { name: ExampleId, backing: UUID }
    commands:
      - name: CreateExample
        payload:
          - { name: name, type: String }
        emits: [ExampleCreated]
    events:
      - name: ExampleCreated
        payload:
          - { name: id, type: String }
          - { name: name, type: String }
`

const EXAMPLE_CONNECTIONS = `\
kind: Connections
context: Example

publishes:
  - { event: ExampleCreated, to: [] }
`

const EXAMPLE_ARD = `\
id: ARD-CUSTOM-000
kind: spirit
family: custom
name: "Example architecture rules"
description: "Umbrella spirit ARD for the example scaffold"
spirit:
  - AGENTS.md#architectural-rules-non-negotiable
severity: error
checks: []
letters:
  - ARD-001
`

const EXAMPLE_ARD_LETTER = `\
id: ARD-001
kind: letter
family: custom
name: "CQRS Boundary"
description: "Commands must be fire-and-forget with no return values"
spirit:
  - ARD-CUSTOM-000
severity: error
checks:
  - description: "No command return values (placeholder — replace with real check)"
    command: "echo 'ARD-001: define a real check here'"
`

// ---------------------------------------------------------------------------
// init command
// ---------------------------------------------------------------------------

export interface InitOptions {
  readonly root?: string
  readonly force?: boolean
}

const writeIfAbsent = (
  path: string,
  content: string,
  force: boolean,
): Effect.Effect<{ path: string; wrote: boolean }> =>
  Effect.gen(function* () {
    if (!force) {
      const exists = yield* Effect.promise(
        () => access(path).then(() => true).catch(() => false),
      )
      if (exists) return { path, wrote: false }
    }
    yield* Effect.promise(() => writeFile(path, content, "utf-8"))
    return { path, wrote: true }
  })

export const runInit = (options: InitOptions = {}): Effect.Effect<number> =>
  Effect.gen(function* () {
    const root = resolve(options.root ?? process.cwd())
    const force = options.force ?? false

    // Create directory structure
    const dirs = [
      join(root, "vocab", "contexts"),
      join(root, "vocab", "connections"),
      join(root, "ards"),
    ]
    for (const dir of dirs) {
      yield* Effect.promise(() => mkdir(dir, { recursive: true }))
    }

    // Write files
    const files: Array<[string, string]> = [
      [join(root, "AGENTS.md"), AGENTS_MD],
      [join(root, "vocab", "contexts", "example.context.yaml"), EXAMPLE_CONTEXT],
      [join(root, "vocab", "connections", "example.connections.yaml"), EXAMPLE_CONNECTIONS],
      [join(root, "ards", "ARD-CUSTOM-000.ard.yaml"), EXAMPLE_ARD],
      [join(root, "ards", "ARD-001.ard.yaml"), EXAMPLE_ARD_LETTER],
    ]

    for (const [path, content] of files) {
      const result = yield* writeIfAbsent(path, content, force)
      const rel = path.replace(root + "/", "")
      if (result.wrote) {
        console.log(`  created  ${rel}`)
      } else {
        console.log(`  exists   ${rel}  (skipped — use --force to overwrite)`)
      }
    }

    console.log("")
    console.log("Next steps:")
    console.log("  1. Edit vocab/contexts/example.context.yaml for your first bounded context")
    console.log("  2. Run `rta context` to verify the vocab is loaded correctly")
    console.log("  3. Run `rta generate --strict` to scaffold TypeScript")
    console.log("  4. Run `rta check` to validate the architectural rules")

    return 0
  })
