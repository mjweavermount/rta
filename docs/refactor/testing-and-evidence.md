# Testing And Evidence

RTA should make tests feel native to the architecture instead of bolted on.

## Test Layers

### Unit Tests

Cover:

- value objects,
- branded type constructors,
- rules,
- decisions,
- pure domain helpers.

These tests should not need adapters, runtime services, or app wiring.

### Step Tests

Cover one step with fake ports.

Step tests should verify:

- accepted input,
- rejected input,
- rules/decisions invoked,
- port calls made,
- typed outcome emitted,
- step evidence emitted.

### Flow Tests

Cover multiple steps connected by flow topology.

Flow tests should verify:

- routing,
- branch behavior,
- retry behavior,
- compensation behavior,
- terminal outcomes,
- flow evidence.

These should usually use in-memory adapters.

### Integration Tests

Cover real adapter boundaries.

Integration tests should verify:

- real database behavior,
- real HTTP/API behavior,
- real filesystem behavior,
- real queue behavior,
- real app API behavior.

They should not be the only proof that a step or flow works.

### Scenario Tests

Cover human-readable app behavior.

A scenario should state:

- given,
- when,
- then,
- what data it touches,
- how to reset,
- what evidence to inspect,
- what a human should see.

### Smoke Tests

Cover deployed or locally served runtime surfaces.

Smoke tests answer:

- is the app reachable,
- does the edge respond,
- is the health endpoint sane,
- does one known scenario still work,
- did expected evidence appear.

## CLI Shape

The CLI should eventually support:

```sh
rta test unit
rta test rule <rule-name>
rta test decision <decision-name>
rta test step <step-name>
rta test flow <flow-name>
rta test scenario <scenario-name>
rta test integration
rta smoke <app-name>
rta check
```

## Evidence Expectations

Tests should verify evidence as a first-class output, not as incidental logs.

Examples:

- Edge tests should assert rejected threats produce `edge.rejected` evidence.
- Step tests should assert successful work produces `step.emitted` evidence.
- Port tests should assert adapter failures map to typed errors and
  `port.call.failed`.
- Scenario tests should capture evidence bundles for catalog review.

## Coverage By Tier

Tiers should imply test obligations. T1 and T2 are always meaningful. T3 only
has obligations when an optional reusable specialization exists.

T1:

- type-level tests where useful,
- pure behavior tests,
- no app-specific adapter requirements.

T2:

- pattern conformance tests,
- generated scaffold tests,
- fake adapter tests where a port is required.

T3, when present:

- concrete specialization tests,
- inherited T1/T2 obligation tests,
- reusable near-leaf fixture tests.

Blueprints:

- generated app skeleton tests,
- composition tests proving included edges, flows, steps, ports, adapters, and scenarios are present,
- scenario tests for generated skeletons.

App-local:

- leaf behavior tests,
- edge threat-model tests,
- scenario tests,
- smoke tests for deployed/runtime paths when applicable.

## Human Review

Human review should not be a code archaeology exercise.

Each scenario run should produce a review packet:

- summary,
- commands run,
- evidence location,
- links to relevant catalog pages,
- observed UI/API output,
- pass/fail notes,
- known gaps.
