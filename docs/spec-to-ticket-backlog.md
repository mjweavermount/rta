# RTA Spec-To-Ticket Backlog

This backlog is the working bridge from `docs/rta-production-authoring-platform-spec.md`
to implementation. It intentionally separates "prototype-covered" from "done."

Plane may mirror this work, but the source of truth is this repo: the spec,
work ledger tickets, checks, tests, generated artifacts, and commits.

## Operating Loop

For each phase:

1. Read the relevant spec clauses.
2. Move one ticket to `in-progress`.
3. Implement the smallest coherent contract slice.
4. Add or tighten checks so the contract cannot silently regress.
5. Add or update the demo path.
6. Run the full validation set.
7. End with the self-audit line:

```text
@did I do all that this phase required, or only a slice? What is still missing?
```

Do not mark a ticket `demo-covered` unless the demo proves the ticket's own
acceptance criteria. Do not mark a ticket `accepted` unless the tree is clean
and the result is committed.

## Ticket Order

### P0 - Rebaseline

- `rta-prod-00-rebaseline-ledger`

Goal: stop overclaiming. Downgrade or split any old ledger item whose demo only
proves a vertical slice.

Self-audit:

```text
@did I reclassify every overclaimed item, or did I leave "demo-covered" meaning "some related demo exists"?
```

### P1 - CLI And Agent Surface

- `rta-prod-01-cli-command-surface`
- `rta-prod-14-docs-agent-experience`

Goal: make the CLI and agent docs match the spec's required working surface:
`init`, `context`, `generate`, `check`, `lint`, `explain`, `graph`, `dev`,
`run`, `review`, `scenario`, `test-scenario`, `work`, `extensions`, `upstream`,
and `doctor`.

Self-audit:

```text
@did each required command exist with a useful behavior or explicit TODO warning, and can an agent tell what to do next?
```

### P2 - Vocab, Tiers, And ARDs

- `rta-prod-02-tier-vocab-contracts`
- `rta-prod-03-ard-spirit-letter-loop`

Goal: make T1/T2/T3 real enough that primitives, patterns, archetypes, and
local extensions have enforceable shape and cannot weaken inherited obligations.

Self-audit:

```text
@did the tier/ARD model enforce obligations mechanically, or did I only add metadata?
```

### P3 - Derivation And Generated Obligations

- `rta-prod-04-derivation-engine`
- `rta-prod-05-generators-generated-sync`

Goal: make derivation the single source for obligations, generated files,
tests, log ceremonies, review gates, telemetry expectations, and provenance
requirements.

Self-audit:

```text
@did checks and generators consume the same derivation output, or are they still rediscovering rules separately?
```

### P4 - Production Checks

- `rta-prod-06-check-production`
- `rta-prod-07-usecase-scenario-boundary`

Goal: implement the production enforcement surface, including use-case,
scenario, boundary, integration, waiver, and demo coverage contracts.

Self-audit:

```text
@would rta check --production fail a plausible fake app that skips user goals, boundary coverage, or review-gated writes?
```

### P5 - Runtime And Observability

- `rta-prod-08-runtime-unit-of-work`
- `rta-prod-09-observability-telemetry`

Goal: make runtime execution, logging, telemetry, provenance, simulated time,
scheduler/worker behavior, and replay coherent.

Self-audit:

```text
@can I watch, replay, and explain a run from logs/provenance without reading source?
```

### P6 - Review And Connector Safety

- `rta-prod-10-review-connector-safety`

Goal: make review a first-class primitive with actor identity, audit trail,
waivers, connector ports, adapter safety, and no unsafe external writes.

Self-audit:

```text
@can any external write happen without a declared connector policy and approved review artifact?
```

### P7 - Generated App Runtime

- `rta-prod-11-generated-app-runtime-wiring`

Goal: generate an app with the declared runtime topology, operational CLI,
scenario targets, local dev entrypoints, and production process wiring.

Self-audit:

```text
@does the generated app CLI, scenario runner, worker, and production process use the same wiring contract?
```

### P8 - Meeting Digest Proving App

- `rta-prod-12-meeting-digest-seed`

Goal: rebuild meeting digest against the finished RTA contracts, not against
handmade shortcuts.

Self-audit:

```text
@is meeting digest using RTA-generated contracts and leaves, or is it still a hand-built demo wearing RTA labels?
```

### P9 - Hosting, Packaging, Release

- `rta-prod-13-hosting-adapter-live`
- `rta-prod-15-package-release`

Goal: make hosting adapter output real, containerized, optionally promotable to
home-lab-v7, and package/release hygiene credible.

Self-audit:

```text
@is this deployable/releasable as an RTA-authored app, or only renderable as a draft artifact?
```

