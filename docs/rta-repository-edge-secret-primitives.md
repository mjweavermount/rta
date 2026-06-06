# RTA Repository, Edge Boundary, And Secret Primitives

Status: initial runtime implementation landed; boundary vocab baseline added

Implemented in this slice:

- `@rta/core`: nominal `Repository`, `RepositoryCodec`, `EdgeBoundary`, and
  `SecretRef` contracts plus typed `RepositoryError`, `EdgeBoundaryError`, and
  `SecretError`.
- `@rta/strict`: sealed instrumented primitive classes for repository,
  edge-boundary, and secret operations. Descendants call public methods that
  invoke the protected hook through the shared lifecycle logger.
- `@rta/runtime`: `InMemoryRepository`, `FileBackedRepository`,
  `SchemaEdgeBoundary`, `FileReadBoundary`, and `InMemorySecretStore`.
- `@rta/vocab`: `ports`, `boundarySchemas`, `adapterBindings`, and
  `publishedLanguages` context declarations, including mandatory boundary
  sanitization metadata and adapter promotion pipelines.
- Golden fixture patterns: `port-contract`, `boundary-schema`,
  `adapter-binding`, `published-language`, and `anti-corruption-layer`.

Still pending:

- generator support for port/boundary-schema files and OpenAPI output
- generated TypeScript brand/fitting support for boundary promotion states
- generator support that emits concrete repositories through the new runtime
  implementations instead of ad hoc app-local repository layers
- SQL boundary implementation
- atomic file writes and versioned snapshot envelopes

## Port And Boundary Schema Vocabulary

`Port` declares a required capability, such as a repository, queue, HTTP client,
GraphQL client, MCP client, filesystem, SQL backend, publication target, or
hosting target. A port is not the adapter. It is the app-owned contract that
says what capability is needed and what boundary schemas cross it.

`BoundarySchema` declares DTO/input/output/OpenAPI/persistence shapes that cross
an edge. DTOs are not domain objects. Inbound DTOs must be validated before
trust promotion and mapped into commands, queries, events, or value objects
before domain logic uses them.

Boundary schemas also declare a mandatory sanitization strategy. Sanitization is
not only string cleanup. It includes validation, normalization, restriction,
redaction, classification, authorization support, and translation into internal
language. A boundary schema that crosses an edge but does not declare
`sanitization.required: true` is invalid RTA vocabulary.

`AdapterBinding` declares which concrete adapter satisfies a port for a runtime
target, such as `local-demo`, `test`, `production-lab`, or `fake`.

Adapter bindings that cross edge-like modes (`file-backed`, `http`, `graphql`,
`mcp`, `sql`, `home-lab`, or `fake`) declare a boundary promotion pipeline:

1. decode the raw external shape
2. sanitize dangerous or policy-sensitive content
3. normalize into canonical boundary form
4. authorize the operation
5. translate into internal command/query/domain language
6. log both promotion and rejection paths without leaking raw secrets

In-memory bindings can be internal test fittings, but they should still consume
the same internal branded contract so tests do not create fake confidence.

`PublishedLanguage` declares public contracts such as OpenAPI, AsyncAPI,
CloudEvents, MCP, or CLI. Published languages are built from boundary schemas
and ports; they should not expose aggregate internals as the public contract.

## Anti-Corruption Layer Pattern

`anti-corruption-layer` is intentionally a pattern, not a T1 primitive. It
belongs around adapters and published languages when an external system has its
own model: AFFiNE, Plane, Otter, Vault, MCP servers, SQL rows, or similar.

The adapter may understand the external model. The domain should not. The
boundary DTO is validated, translated, and only then promoted into RTA domain
language.

## Repository Primitive

`T1.Repository` is a DDD repository primitive for loading, saving, and
allocating IDs for aggregate roots. It is not a Git/source repository concept.

Baseline obligations:

- `RepositoryHasAggregate`
- `RepositoryOnlyPersistsAggregateRoots`
- `RepositoryFindByIdIsLogged`
- `RepositorySaveIsLogged`
- `RepositoryNextIdIsLogged`
- `RepositoryErrorsAreTyped`
- `RepositoryReturnsDomainObjectsOnlyAfterValidation`
- `RepositoryDoesNotExposeRawPersistenceShape`

Required operation events:

- `findById`
- `save`
- `nextId`

## In-Memory Repository Pattern

`T2.Pattern.InMemoryRepository` extends `T1.Repository`.

It is for tests, local scenarios, and deterministic demos. It does not cross an
external edge by default, but it must avoid fake confidence.

Initial implementation: `InMemoryRepository` in `@rta/runtime`.

Obligations:

- `InMemoryStoreIsScenarioScoped`
- `InMemoryStoreIsResettable`
- `InMemoryStoreDoesNotLeakAcrossTests`
- `InMemorySeedDataIsValidated`
- `InMemoryOperationsAreDeterministic`
- `InMemoryIdGenerationUsesInjectedClockOrIdPort`
- `InMemoryConcurrencyBehaviorIsDeclared`
- `InMemoryReadsAreLogged`
- `InMemoryWritesAreLogged`
- `InMemorySnapshotCanBeExportedForDebugging`

## File-Backed Repository Pattern

`T2.Pattern.FileBackedRepository` extends `T1.Repository` and crosses
`T2.Pattern.FileSystemBoundary`.

File reads are edge input. Local disk is not trusted domain data.

Initial implementation: `FileBackedRepository` in `@rta/runtime`, using a
`RepositoryCodec` for decode/encode validation.

Obligations:

- `FilePathIsContained`
- `FilePathIsCanonicalized`
- `FileEncodingIsDeclared`
- `FileFormatIsVersioned`
- `FilePayloadIsSchemaValidated`
- `FilePayloadIsTypecastBeforeTrustPromotion`
- `FileCorruptionReturnsTypedError`
- `FileReadIsLogged`
- `FileWriteIsLogged`
- `FileWriteIsAtomic`
- `FileWriteDoesNotPartiallyCommit`
- `FileSecretsAreRedactedInLogs`
- `RawFileBytesDoNotReachDomainUnchecked`

Required operation events:

- inherited `findById`
- inherited `save`
- inherited `nextId`
- `readFile`
- `writeFile`
- `ensureStore`
- `validateSnapshot`
- `promoteTrust`

## Edge Boundary Primitive

`T1.EdgeBoundary` represents a place where data crosses from an external,
untrusted, or less-trusted world into an RTA-controlled context.

Examples:

- file reads
- HTTP requests
- CLI input
- connector reads
- SQL result rows
- Otter/AFFiNE/Plane/GitHub payloads

Baseline obligations:

- `EdgeInputIsValidated`
- `EdgeInputIsTyped`
- `EdgeInputTrustIsPromotedExplicitly`
- `EdgeRejectedInputIsLogged`
- `EdgeRawInputDoesNotReachDomainUnchecked`
- `EdgeSourceIsIdentified`
- `EdgePayloadMayBeRedacted`

Initial implementations: `SchemaEdgeBoundary` and `FileReadBoundary` in
`@rta/runtime`.

Required operation events:

- `readExternal`
- `parseExternal`
- `validateExternal`
- `sanitizeExternal`
- `normalizeExternal`
- `authorizeExternal`
- `promoteTrust`
- `rejectExternal`

## Boundary Sanitization Pattern

`T2.Pattern.BoundarySanitization` extends `T1.EdgeBoundary` and
`T1.BoundarySchema`.

Boundary sanitization is a required stage in trust promotion. It is
strategy-specific: file paths are contained and canonicalized, SQL values use
prepared statements and whitelisted identifiers, MCP tool input is decoded and
policy-checked, transcripts are bounded and classified, external API responses
are translated through an anti-corruption layer, and secrets are redacted before
they can appear in logs or artifacts.

Obligations:

- `BoundarySchemaDeclaresSanitization`
- `SanitizationStrategyMatchesBoundaryKind`
- `RawInputDoesNotReachDomain`
- `SanitizerLogsPromotionWithoutSecrets`
- `SanitizerLogsRejectionWithoutSecrets`
- `SanitizedValueIsBrandedBeforeInternalUse`
- `AdapterBindingDeclaresPromotionPipeline`
- `PromotionPipelineRunsDecodeBeforeSanitize`
- `PromotionPipelineRunsTranslateBeforeDomainDispatch`

## SQL Boundary Pattern

`T2.Pattern.SqlBoundary` extends `T1.EdgeBoundary`.

Obligations:

- `SqlUsesPreparedStatements`
- `SqlIdentifiersAreWhitelisted`
- `SqlInputsAreTypecast`
- `SqlEscapingIsNotPrimaryDefense`
- `SqlUnsafeRawQueryRequiresReviewWaiver`

Policy:

- prepared statements are required for values
- whitelisting is required for identifiers and structural SQL pieces
- type parsing is required before trust promotion
- escaping alone does not satisfy the safety requirement

## Secret Primitive

`T1.Secret` represents a value whose raw form must not be logged, casually
persisted, rendered into artifacts, or passed across a boundary without an
explicit policy.

Baseline obligations:

- `SecretValueIsRedacted`
- `SecretSourceIsDeclared`
- `SecretAccessIsLogged`
- `SecretDoesNotAppearInReadableLogs`
- `SecretDoesNotAppearInArtifacts`
- `SecretRequiresCapabilityToReveal`
- `SecretCanBeComparedWithoutRevealing`
- `SecretRotationOrExpiryIsDeclaredWhenRelevant`

Patterns:

- `T2.Pattern.EnvironmentSecret`
- `T2.Pattern.FileSecret`
- `T2.Pattern.VaultSecret`
- `T2.Pattern.ApiToken`

Effect services to introduce:

- `SecretStore`
- `Redactor`
- `RevealSecretCapability`

Readable logs should show values as `[REDACTED:<SecretName>]`.

Initial implementation: `InMemorySecretStore` in `@rta/runtime`; readable logs
emit `[secret]` and do not include cleartext values.
