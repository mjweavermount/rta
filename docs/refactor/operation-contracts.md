# Operation Contracts

This document describes the contracts that should eventually be enforceable by
schemas, generators, checks, tests, and runtime wrappers.

## External Boundary / Translator Contract

External boundaries/translators defend.

Required declaration:

```ts
externalBoundary({
  name: "CreateDocumentHttpBoundary",
  protocol: "http",
  trust: "external",
  actor: "required",
  input: "CreateDocumentHttpRequest",
  trustedOutput: "CreateDocumentCommand",
  threatModel: [
    "malformed-json",
    "unknown-fields",
    "oversized-payload",
    "html-injection",
    "prompt-injection",
    "unauthorized-actor"
  ],
  sanitizers: [
    "parse-json-strict",
    "schema-validate",
    "strip-dangerous-html",
    "normalize-whitespace",
    "redact-secrets"
  ],
  rejects: [
    "invalid-schema",
    "missing-actor",
    "payload-too-large"
  ],
  evidence: [
    "boundary.received",
    "boundary.validated",
    "boundary.sanitized",
    "boundary.authorized",
    "boundary.rejected",
    "boundary.trusted-output"
  ]
})
```

The important invariant:

> No untrusted payload reaches a step.

## Flow Contract

Flows connect typed outcomes to steps.

Required declaration:

```ts
flow({
  name: "CreateDocumentFlow",
  startsWith: "CreateDocumentCommand",
  steps: [
    "ValidateDocumentRequestStep",
    "PersistDocumentStep",
    "PublishDocumentCreatedStep"
  ],
  routes: [
    ["DocumentRequestValidated", "PersistDocumentStep"],
    ["DocumentPersisted", "PublishDocumentCreatedStep"],
    ["ValidationRejected", "terminal.rejected"]
  ],
  evidence: [
    "flow.started",
    "flow.routed",
    "flow.completed",
    "flow.failed"
  ]
})
```

Steps should not call each other directly. The flow owns topology.

## Step Contract

Steps decide and act.

Required declaration:

```ts
step({
  name: "PersistDocumentStep",
  input: "DocumentRequestValidated",
  uses: ["DocumentRepository", "Clock"],
  rules: ["DocumentTitleIsPresent"],
  decisions: ["SelectDocumentVisibility"],
  emits: ["DocumentPersisted", "DocumentPersistenceFailed"],
  evidence: [
    "step.received",
    "step.decided",
    "step.port-called",
    "step.emitted",
    "step.failed"
  ]
})
```

Implementation rule:

> Steps call ports, not adapters.

## Port Contract

Ports are capability contracts.

Required declaration:

```ts
port({
  name: "DocumentRepository",
  direction: "driven",
  capability: "document-storage",
  methods: {
    load: {
      input: "DocumentId",
      output: "Document",
      errors: ["not-found", "unavailable"]
    },
    save: {
      input: "Document",
      output: "void",
      errors: ["conflict", "unavailable"]
    }
  },
  evidence: [
    "port.call.started",
    "port.call.succeeded",
    "port.call.failed"
  ]
})
```

Ports should generate Effect services/interfaces and test doubles.

## Adapter Contract

Adapters fulfill ports.

Required declaration:

```ts
adapter({
  name: "AffineGraphqlDocumentRepository",
  implements: "DocumentRepository",
  dependency: "affine-graphql",
  config: "AffineGraphqlConfig",
  failureMapping: "AffineGraphqlDocumentRepositoryErrors",
  evidence: [
    "adapter.request",
    "adapter.response",
    "adapter.retry",
    "adapter.failure"
  ]
})
```

Adapters may be app-specific or reusable.

## Rule Contract

Rules explain invariants.

Required declaration:

```ts
rule({
  name: "DocumentTitleIsPresent",
  tier: "app-local",
  input: "DocumentDraft",
  result: "RuleResult",
  reasons: ["missing-title"],
  derivedFrom: ["NonEmptyTextRule"],
  evidence: ["rule.evaluated"]
})
```

Rules should expose reason codes and be easy to test directly.

## Decision Contract

Decisions explain branching.

Required declaration:

```ts
decision({
  name: "SelectDocumentVisibility",
  input: "DocumentDraft",
  output: "DocumentVisibility",
  cases: ["private", "workspace", "public"],
  reasons: ["explicit-request", "workspace-default"],
  evidence: ["decision.selected"]
})
```

Decisions should be visible in flow evidence when they affect routing.

## Evidence Contract

Every operation node should emit structured evidence.

Minimum evidence fields:

```ts
{
  id: "event-id",
  kind: "step.emitted",
  app: "docs",
  context: "documents",
  operation: "CreateDocumentFlow",
  node: "PersistDocumentStep",
  actor: "user-or-system",
  correlationId: "operation-correlation-id",
  causationId: "parent-event-id",
  at: "iso-timestamp",
  summary: "Document persisted",
  inputRef: "redacted-or-hashed-input-ref",
  outputRef: "redacted-or-hashed-output-ref",
  reasons: ["workspace-default"],
  links: {
    source: "...",
    declaration: "...",
    scenario: "..."
  }
}
```

Evidence should be readable first and machine-queriable second.
