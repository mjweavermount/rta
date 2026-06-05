# Meeting Digest Agent Guide

This is the proving app for RTA. It should demonstrate RTA contracts; it should not become the RTA platform itself.

## Scenarios

Use these through RTA or the app CLI:

```bash
node scripts/rta.mjs scenario run meeting-digest.integrated.fixture --review --high
node scripts/rta.mjs scenario run meeting-digest.streaming.fixture --high
node scripts/rta.mjs scenario run meeting-digest.loopback.fixture --high
node scripts/rta.mjs scenario run meeting-digest.enrichment-unavailable.fixture --high
node examples/meeting-digest-seed/bin/meeting-digest.mjs scenario run approved-digest-publishes-work-items --review --high
```

## App Boundaries

- Ingestion reads a transcript path, inline transcript fixture, or default fixture.
- Topic segmentation merges loopbacks rather than duplicating repeated topics.
- Task extraction emits goal, user, systems, integrations, larger system, classification, and confidence.
- Enrichment must say when context is unavailable.
- Reviewable output must pass through local review before dry-run publication.

## Edit Rules

- Keep app-specific behavior in this directory.
- Keep reusable RTA checks, runtime, generators, and adapters in `packages/`.
- Do not add hard AFFiNE, Plane, Otter, or home-lab writes here. Use connector policies and dry-run fixtures until a reviewed adapter exists.
