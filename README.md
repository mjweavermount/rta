# RTA

RTA is a TypeScript app-authoring platform for governed, observable,
reviewable applications from domain vocabulary.

This repo now supersedes the previous RTA/Rita attempts. The old `.mjs`
prototype remains useful as requirement evidence, but the production foundation
is the pnpm TypeScript workspace in this repo.

## Start Here

- [RTA Production Authoring Platform Spec](docs/rta-production-authoring-platform-spec.md)
- [RTA-ish Source Inventory](docs/rta-ish-source-inventory.md)
- [RTA Reset Plan Board](docs/rta-reset-plan-board.md)
- [RTA To Live Meeting Digest Milestones](docs/meeting-digest-live-milestones.md)

## Workspace

```text
packages/vocab      declarative bounded-context vocabulary
packages/core       CQRS primitives and governed execution kernel
packages/strict     strict runtime wrappers and operation event projections
packages/cli        vocab/generator/check CLI
packages/scenario   scenario capture and reporting
examples/meeting-digest
                    TypeScript proving fixture for meeting digest extraction
```

## Validation

Use the package manager declared by the repo:

```bash
npm exec --yes pnpm@9.0.0 -- check
```

The check runs:

- workspace build
- recursive TypeScript typecheck
- package tests
- meeting digest example tests
- golden fixture pass/fail loop
- sample-app loop

## Current Proving App

The clean meeting digest proving fixture lives in:

```text
examples/meeting-digest
```

It proves the reset direction by running transcript digestion through:

- strict command construction
- `OperationScope`
- commit capability enforcement
- an instrumented command handler
- topic and work-item extraction
- review-gated dry-run publication shape
- readable logs projected from structured operation events

## Plane

Plane may mirror work later. It is not the source of truth for this reset.
Use [docs/rta-reset-plan-board.md](docs/rta-reset-plan-board.md) as the active
board until a supported Plane project/card creation path exists.
