# T1 Vocabulary Spec

T1 is the smallest durable vocabulary RTA allows the rest of the system to
stand on. It should feel boring, strict, and reusable.

T1 is not "the first things we built" and it is not "everything shared." It is
the app-independent architectural grammar needed for generation, checking,
testing, evidence, and source navigation.

## Definition

T1 is the minimal, durable vocabulary for describing RTA-shaped software,
independent of any specific app.

A T1 item should be:

- app-independent,
- semantically stable,
- useful across many apps or framework packages,
- testable generically,
- useful for generation, checking, evidence, or source navigation,
- harmful if every app invented its own version.

If a concept is expressive, app-specific, clever, or integration-specific, it
probably does not belong in T1.

## Admission Rules

A vocabulary item can be T1 only when all of these are true:

1. It has app-independent meaning.
2. It is needed by more than one app shape or framework subsystem.
3. It can have a short, durable description.
4. It can define generic test obligations.
5. It improves typed generation, structural checks, runtime evidence, or source
   navigation.
6. It can be named without referencing a concrete vendor, app, deployment
   target, or business domain.

An item should be rejected from T1 when:

- it names a specific app,
- it names a specific integration,
- it names a deployment choice,
- it describes one business domain,
- it exists mainly for UI layout,
- it cannot be tested except through one concrete app,
- it is only historical.

## Candidate T1 Categories

### Identity And Naming

These atoms let RTA point at things consistently.

Plausible T1 items:

- `Identifier`
- `Name`
- `QualifiedName`
- `Slug`
- `Namespace`
- `Version`
- `Provenance`
- `SourceLocation`
- `DeclarationLocation`

Reason:

Agents and generators need stable ways to name, locate, and relate structural
parts without inventing anonymous strings.

### Trust And Boundary

These atoms make boundary defense and translation enforceable.

Plausible T1 items:

- `TrustLevel`
- `Actor`
- `Principal`
- `Capability`
- `Permission`
- `Threat`
- `ThreatModel`
- `Sanitizer`
- `ExternalBoundary`
- `BoundaryTranslator`
- `ValidationResult`
- `Rejection`
- `Redaction`

Reason:

Every untrusted boundary needs common language for what it accepts, rejects,
normalizes, redacts, translates, and authorizes before internal steps receive
trusted inputs.

### Operation And Evidence

These atoms are the logging and causality spine.

Plausible T1 items:

- `OperationScope`
- `CorrelationId`
- `CausationId`
- `EvidenceEvent`
- `EvidenceLink`
- `ReasonCode`
- `DecisionTrace`
- `Outcome`
- `StepOutcome`

Reason:

If apps invent incompatible operation and evidence language, the catalog,
scenario runner, logs, and review packets cannot line up.

### Type And Data Shape

These atoms describe data moving through or across the system.

Plausible T1 items:

- `Schema`
- `Field`
- `Constraint`
- `Payload`
- `Command`
- `Query`
- `Event`
- `DTO`
- `Result`
- `Failure`

Reason:

Generation and edge validation need common language for what data shape means.

### Domain Modeling

These are the durable DDD atoms RTA should preserve.

Plausible T1 items:

- `ValueObject`
- `Entity`
- `Aggregate`
- `DomainEvent`
- `Rule`
- `Decision`
- `Invariant`

Reason:

These are not app-specific. They are the core domain modeling vocabulary used by
bounded contexts.

### Operational Structure

These are the main RTA application grammar items.

Plausible T1 items:

- `App`
- `BoundedContext`
- `ExternalSurface`
- `ExternalBoundary`
- `BoundaryTranslator`
- `Flow`
- `Step`
- `Saga`
- `Port`
- `Adapter`
- `Repository`
- `Scenario`

Reason:

These describe how an RTA app is structured and how work moves through it.

Current source still contains `Edge` and `EdgeBoundary`. Treat those as legacy
or provisional names until Phase 0B either redefines them cleanly or replaces
them with explicit boundary/translator vocabulary.

`BoundedContext` should not become the accidental parent of every useful idea.
It is close to a hexagon: a protected domain area with explicit external
surface, ports, adapters, steps, flows, rules, decisions, and evidence. The
other operational concepts need their own vocabulary and checks.

### Testing And Obligation

These atoms make tiers enforceable instead of decorative.

Plausible T1 items:

- `Obligation`
- `Check`
- `TestExpectation`
- `Fixture`
- `ScenarioAssertion`
- `CoverageWaiver`
- `ReviewPacket`

Reason:

Tiers need native language for what must be proven, what can be waived, and what
a human should inspect.

### Generation And Source Discipline

These atoms protect the repo from drift and unsupported agent invention.

Plausible T1 items:

- `GeneratedFile`
- `HandAuthoredLeaf`
- `ProvenanceHeader`
- `Generator`
- `GeneratedArtifact`
- `StaleArtifact`
- `OrphanedSource`

Reason:

If generated structure matters, the framework needs core vocabulary for source
origin, regeneration, and drift.

## Likely Missing Or Under-Modeled T1 Items

These are high-priority candidates to audit against the current repo:

- `Threat`
- `ThreatModel`
- `Sanitizer`
- `EvidenceEvent`
- `ReasonCode`
- `Obligation`
- `GeneratedArtifact`
- `SourceLocation`
- `DeclarationLocation`
- `ScenarioAssertion`
- `ReviewPacket`
- `StepOutcome`

These items connect the security, evidence, testing, generation, and catalog
stories. If they are missing or vague, the rest of the architecture becomes
harder to enforce.

## Non-T1 Examples

These should not be T1:

- `AFFiNE`
- `Zulip`
- `Plane`
- `Postgres`
- `Kubernetes`
- `HTTPRouteForHelloLab`
- `MeetingDigestSummaryRule`
- `VirgilInfoDomain`
- concrete database tables,
- concrete deployment hosts,
- specific adapter implementations,
- specific business rules,
- UI layout categories,
- historical workbench-only terms.

These may be T2/T3 specializations, app-local vocabulary, adapter implementations,
blueprint/composition details, or catalog presentation details.

## Relationship To Higher Tiers

T1 should define the skeleton and generic obligations.

T2 should define reusable specializations of T1 items.

T3 may define more concrete reusable specializations of T2 items when the extra
rung earns its keep.

App-local vocabulary should bind these ideas to concrete business or
integration meaning.

The tier ladder is `T3 is-a T2 is-a T1` only when T3 is present. T1 and T2 are
the normal path. If a reusable artifact has several vocabulary parts, it is
probably a blueprint, recipe, template, or app skeleton. That composition layer
is valuable, but it is not a tier relationship.

Use T3 only when:

- the same T2 specialization repeats across apps or contexts,
- the specialization adds meaningful obligations,
- the catalog explanation becomes clearer with the extra level,
- generated code or tests become less ad hoc.

Do not use T3 merely because a leaf is more specific than T2. App-local language
is allowed to stay app-local.

Example:

```text
T1: Rule
T2: PositiveValueRule
T3: PositiveMoneyRule
App-local: InvoiceTotalMustBePositive
```

Example:

```text
T1: Edge
T2: AuthenticatedEdge
T3: AuthenticatedJsonHttpEdge
App-local: CreateDocumentHttpEdge
```

Example:

```text
T1: Port
T2: RepositoryPort
T3: VersionedAggregateRepositoryPort
App-local: DocumentRepository
Adapter: AffineGraphqlDocumentRepository
```

Non-example:

```text
WebhookIngestAppBlueprint
```

That is not a T3 child of `Edge`, `Flow`, or `Step`. It is a composition that has edges,
flows, steps, ports, adapters, scenarios, and test expectations.

## T1 Page Shape

Each T1 item should eventually have a catalog/wiki page with:

- name,
- kind,
- durable description,
- why it exists,
- what it is not,
- contract shape,
- generic obligations,
- source skeleton,
- tests,
- examples of T2 and app-local specialization,
- related concepts.

## T1 Source Shape

T1 source should be mostly skeletons, branded types, base interfaces, helpers,
schemas, and generic test utilities.

T1 source should avoid:

- app-specific examples inline with the primitive,
- vendor-specific behavior,
- runtime deployment assumptions,
- concrete storage/API implementation details.

## T1 Audit Procedure

For each current T1 item:

1. Read the declaration and source.
2. Apply the admission rules.
3. Classify it as:
   - keep T1,
   - rename and keep T1,
   - split,
   - demote to T2,
   - demote to app-local/example,
   - move to `/junkyard` or delete.
4. Confirm it has:
   - description,
   - source,
   - test obligations,
   - catalog page,
   - relationship to parent/child concepts.

## T1 Repair Plan

1. Add or correct T1 declarations first.
2. Add prose descriptions and source skeletons.
3. Add generic tests or test obligations.
4. Add catalog pages.
5. Add checks for missing/invalid T1 metadata.
6. Gradually promote app-local or T2 language only after evidence supports it.

Do not fully implement every T1 candidate immediately. It is acceptable to
create valid stubs with clear obligations, then wire enforcement over time.

## Acceptance Criteria

The T1 repair is successful when:

- every T1 item passes the admission rules,
- every T1 item has a useful description,
- every T1 item has source or a source skeleton,
- every T1 item has test obligations,
- the catalog can explain each T1 item without relying on file names alone,
- app-local vocabulary can point at inherited T1 obligations,
- checks fail when agents invent structural vocabulary outside the system.
