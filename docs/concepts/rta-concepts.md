# RTA Concepts

This file is the source anchor for the concept articles exposed by the local RTA catalog.
The catalog turns these ideas into navigable entries with related source paths, checks, ARDs,
and source-link overlays.

## RTA Heart

RTA makes app behavior explicit enough for humans, agents, tests, and generated runtime code
to share one model. It is not a replacement for source code; it is the connective tissue that
keeps source code, vocabulary, architecture records, generated leaves, tests, and operator
evidence in conversation.

## Authoring Loop

The normal loop is declare, generate or wire, run checks, inspect evidence, and promote useful
language upstream. A declaration is useful only when there is some visible proof that it still
describes the running or generated system.

## Vocabulary Ladder

Tiers are inheritance and specialization, not composition. T1 is the durable core vocabulary,
T2 is a reusable specialization of a T1 item, and T3 is an optional more concrete reusable
specialization of a T2 item. Extension language belongs close to the app until it earns
promotion. This lets apps invent local language without forcing every experiment into the
shared core.

## DDD Inspiration

RTA borrows useful DDD terms such as bounded context, aggregate, port, adapter, repository,
command, query, event, reaction, and process manager. The value is boundary discipline, not
ceremony. Terms stay only when they help generation, testing, logging, or review.

## Primitives, Patterns, And Blueprints

Patterns are reusable vocabulary units with required primitives and test contracts. A T2 or T3
item must be able to say "this is a kind of its parent." Larger app shapes are blueprints:
they compose vocabulary items but are not themselves higher-tier descendants of every item they
contain.

## Extensions And Upstreaming

Extension vocabulary starts near the app. Repeated, stable, tested vocabulary can be hoisted
upstream into the shared tiers while preserving provenance.

## App Anatomy

An RTA app is a bundle of contexts, operations, boundaries, runtime adapters, tests, demos, and
publication evidence. The app owns its domain language; hosting details remain adapter concerns.

## Entry Points And Wiring

Entry points are how work enters the app: commands, queries, events, CLI subcommands, MCP tools,
HTTP endpoints, or scheduled jobs. Wiring maps entry points to operations and runtime dependencies.

## Boundaries, Ports, Adapters, And DTOs

Boundary schemas define payloads crossing into or out of a model. Ports declare needed
capabilities. Adapters fulfill those capabilities. DTOs keep edge payloads explicit.

## CQRS And Domain Flow

Commands change state, queries read state, events describe what happened, and reactions or process
managers decide what follows. Keeping those ideas separate makes flows observable and testable.

## Repositories And State

Repositories are contracts between model behavior and durable state. Runtime storage choices,
including file-backed adapters, stay behind declared ports.

## Security And Sanitization

External input should enter through explicit edge boundaries. Those boundaries validate,
sanitize, and fail in a way operators and tests can inspect.

## ID Story And Branded Fittings

Stable identifiers let catalog pages, source links, ARDs, tests, and generated files point at the
same thing. Branded fittings keep meaningful identifiers from becoming anonymous strings.

## Effect TS Runtime

Effect provides the runtime vocabulary for layers, dependencies, managed execution, typed failure,
and tracing. RTA uses those concepts to keep generated runtime behavior inspectable.

## CLI And Generators

The CLI is the operator workbench. It checks declarations, generates runtime files, serves the
catalog, runs demos, and exposes local APIs for inspection.

## ARDs And Enforcement

Architecture records explain why a rule exists and how the repo knows whether it is still honored.
The best ARDs point to checks or tests.

## Tests, Scenarios, And Coverage

Tests cover code. Scenarios cover behavior. Catalog evidence connects both back to vocabulary,
records, and source paths.

## Work Ledger And Demo Contract

Demos should state what they prove, what data they touch, how to reset them, and what a human
should observe. A work ledger preserves what ran and what evidence was captured.

## Operation Events And Readable Logs

Operation scope carries actor, correlation, causation, timing, and identity through a run.
Readable logs make that flow understandable without a debugger.

## Jobs, Flows, And Schedulers

Scheduled and asynchronous work should still enter through declared operations and leave observable
evidence. A job is an entry point, not a side door.

## Monitoring And Provenance

Every catalog entry should point back to source, records, checks, tests, or runtime evidence.
Monitoring should connect runtime symptoms to app-contract language.

## Deployment Adapters

Deployment adapters connect host-neutral app intent to concrete environments without forcing
infrastructure details into the model.

## MCP And AFFiNE Apps

MCP and AFFiNE integrations prove that RTA can expose useful agent-facing tools while keeping app
boundaries, credentials, and source custody explicit.

## Meeting Digest Proving App

A meeting digest app should store raw transcripts first, then derive summaries, todos, topic maps,
and decisions with provenance back to the transcript.

## Agent Experience

Agents need concise entry points, source links, tests, and records. The catalog should make the
next good inspection step obvious while separating exploration from mutation.
