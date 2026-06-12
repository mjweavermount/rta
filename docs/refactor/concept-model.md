# Concept Model

This is the vocabulary RTA should converge on. Names may still change, but the
responsibilities should not blur.

## App

An app is a deployable or runnable unit of behavior. It owns one or more bounded
contexts, flows, entry points, scenarios, and evidence expectations.

An app is not the same as a process, container, package, or deployment target.
Those are runtime/deployment concerns.

## Bounded Context / Hexagon

A bounded context is the domain language and boundary around a coherent model.
It is close to a hexagon, but RTA should avoid making it the unit that does
everything.

The current direction is that steps operate inside sanitized bounded contexts.
The bounded context/hexagon owns the trusted domain vocabulary and internal
rules, while ports and surface translators do the important work of turning raw
outside input into trusted aggregates, commands, values, and actor context.

A bounded context owns:

- domain language,
- aggregates,
- value objects,
- commands,
- queries,
- events,
- domain-specific rules and decisions,
- ports,
- external surface declarations.

It should not hide the operational story. Flows and steps tell that story.

## External Surface

An external surface is the set of ways the outside world can interact with a
bounded context or app.

Examples:

- HTTP API,
- CLI commands,
- MCP tools,
- webhooks,
- queue consumers,
- scheduled jobs.

The surface names what exists. The defensive boundary work should happen at the
surface/port translation layer before a step receives input.

## Edge

`Edge` is currently a suspect / legacy term.

It came from an earlier model where almost every operation was being treated as
a bounded context. It may remain as shorthand for an external entry adapter, but
it should not be assumed to be a durable first-class runtime concept until the
refactor proves it.

The durable requirement is not "every app has edges." The durable requirement is:
raw external payloads are parsed, validated, sanitized, authorized, translated
into trusted domain/application input, and evidenced before steps touch them.

Likely homes for that work:

- external surface declarations,
- inbound adapter wrappers,
- port translators,
- generated request/command codecs,
- threat-model-aware validation/sanitization modules.

Examples:

- `CreateInvoiceHttpEdge`,
- `AffineMcpToolEdge`,
- `StripeWebhookEdge`,
- `ImportCsvCliEdge`.

These examples are provisional. They may become inbound adapters or surface
handlers rather than `Edge` concepts.

## Flow

A flow is visible operation topology. It connects steps by typed outcomes.

Flows answer:

- what starts this operation,
- which steps can run,
- what branches exist,
- where retries happen,
- where compensation happens,
- what terminal outcomes exist.

## Saga / Process Manager

A saga is a flow that can be long-running, partially complete, compensating, or
dependent on external events over time.

Sagas should emit evidence that makes partial progress legible.

Open design question: flows need a standard pattern for waiting on in-flight I/O
and resuming work. If the operation waits across time, external events, retries,
or compensation, that may be definitionally saga/process-manager territory. If
the wait is only an ordinary port call inside one step, it should probably stay
inside step/port evidence.

## Step

A step is one meaningful unit of trusted work.

Steps decide and act.

A step receives trusted input, applies rules/decisions, calls ports, changes
state, emits typed outcomes, and records evidence.

Steps are the primary human-readable story units.

Steps must not talk to adapters directly. A step calls ports/capabilities. The
runtime wiring chooses adapters outside the step.

## Rule

A rule is an invariant or check. It returns a result with reasons, not just a
bare boolean when the result matters.

Generic rules can be upstream primitives. Domain-specific rules should still be
declared where the domain meaning lives.

## Decision

A decision classifies or selects a path.

Decisions should be explicit when a branch matters to business behavior,
security posture, operational evidence, or future review.

## Port

A port is a named capability contract.

It is essentially a classical interface with RTA metadata:

- capability name,
- method names,
- input/output types,
- errors,
- evidence expectations,
- test/fake requirements.

Steps depend on ports.

## Adapter

An adapter is a concrete implementation of a port.

Adapters talk to concrete things:

- databases,
- filesystems,
- external APIs,
- queues,
- clocks,
- random/ID generators,
- browsers,
- AI providers,
- app APIs.

Adapters do not own domain meaning.

## Repository

A repository is a port shape for loading/saving aggregate or durable state.

Repository calls should emit evidence for load/save target, version, conflict,
snapshot/checkpoint, and failure.

## Evidence

Evidence is structured runtime proof of what happened.

Evidence should exist at edge, flow, step, rule/decision, port, adapter,
repository, and scenario levels.

## Scenario

A scenario is a human-readable behavior proof. It connects app behavior to
fixtures, execution, observable output, and evidence.

## Tier

A tier defines inheritance, obligation, and promotion semantics for vocabulary.

- T1: durable primitive/skeleton language,
- T2: reusable specializations of T1 items,
- T3: optional, more concrete reusable specializations of T2 items,
- app-local: concrete app vocabulary not yet promoted.

Tier relationships must read as `T3 is-a T2 is-a T1` when T3 exists. If a
proposed child cannot truthfully say "I am a kind of my parent," it is not a
tier relationship. T3 is not mandatory; T1 and T2 carry the core vocabulary
contract.

## Blueprint

A blueprint is a reusable composition of tiered vocabulary items.

Blueprints are `has-a` structures, not `is-a` vocabulary descendants. For example,
`AuthenticatedJsonHttpEdge` can be a T3 specialization of `Edge`, but a
`WebhookIngestAppBlueprint` has an edge, flow, steps, ports, adapters, and scenarios.
The blueprint should generate or validate those pieces without pretending to be a
higher-tier edge, step, or port.

## Concept Article

A concept article is the human explanation of a vocabulary item. It should link
to source, declarations, tests, and examples.

## Source Browser

The source browser is the territory view. It should stay available, but it is
not the same as the concept wiki.
