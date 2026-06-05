# RTA Repository, Edge Boundary, And Secret Primitives

Status: initial runtime implementation landed; vocab blooming still pending

Implemented in this slice:

- `@rta/core`: nominal `Repository`, `RepositoryCodec`, `EdgeBoundary`, and
  `SecretRef` contracts plus typed `RepositoryError`, `EdgeBoundaryError`, and
  `SecretError`.
- `@rta/strict`: sealed instrumented primitive classes for repository,
  edge-boundary, and secret operations. Descendants call public methods that
  invoke the protected hook through the shared lifecycle logger.
- `@rta/runtime`: `InMemoryRepository`, `FileBackedRepository`,
  `SchemaEdgeBoundary`, `FileReadBoundary`, and `InMemorySecretStore`.

Still pending:

- vocab-tier declarations and blooming checks for these primitives
- generator support that emits concrete repositories through the new runtime
  implementations instead of ad hoc app-local repository layers
- SQL boundary implementation
- atomic file writes and versioned snapshot envelopes

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
- `promoteTrust`
- `rejectExternal`

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
