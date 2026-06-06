# RTA Markdown To AFFiNE Projection

Status: seed implementation for source-owned Markdown projections.

The current target is deliberately simple:

- personal Obsidian vaults and shared Git Markdown repos remain source
  authorities;
- AFFiNE receives bot/admin-owned read-only projections;
- the owning human cannot edit the projected AFFiNE copy;
- shared Git repos stay naked Markdown, with no required sidecars;
- projection identity, AFFiNE doc IDs, aliases, and hashes live in an external
  projection registry;
- Git rename/history evidence preserves identity when files move;
- AFFiNE-native canvases remain AFFiNE-owned and can link to projected docs.

## RTA Shape

The seed app lives at:

```text
examples/markdown-projection
```

It composes these primitives:

- `MarkdownSourceScanner`: reads Markdown and Git rename evidence through a
  source port.
- `MarkdownProjectionBoundary`: treats local files as external input and rejects
  hidden/control paths.
- `ReadOnlyProjectionPolicy`: enforces bot-owned, non-editable AFFiNE
  projection posture.
- `ProjectionRegistryRepository`: resolves source path and rename history into
  stable AFFiNE document identity.
- `MarkdownToAffineProjector`: renders source Markdown into a derived AFFiNE
  reading surface.
- `AffineReadonlyProjectionAdapter`: upserts AFFiNE projections and saves the
  external registry record.

## Why No Sidecars

The shared Markdown repo should feel like a normal developer collaboration repo.
RTA can validate and project it, but the repo itself should not need RTA control
files for ordinary documents. If stable identity metadata becomes necessary, it
belongs in the projection registry first, not beside the Markdown.

## Agent Workflow

Agents should read AFFiNE projections and registry metadata, resolve projected
docs back to source paths, then edit shared Markdown through Git branches,
commits, PRs, or staged patches. Projection sync updates AFFiNE after source
changes land.

## Local Operator Slice

The seed now includes a local operator adapter:

```text
examples/markdown-projection/src/local.ts
```

It provides:

- filesystem Markdown scanning;
- Git commit and rename evidence;
- JSON projection registry persistence outside the source repo;
- JSON-backed fake AFFiNE projection sink;
- projection verification;
- source/AFFiNE explanation lookup.

The CLI entrypoint is:

```text
markdown-projection plan|apply|verify|explain|demo|doctor
```

Example:

```sh
pnpm --filter @rta/example-markdown-projection build
node examples/markdown-projection/dist/cli.js apply \
  --source-root /path/to/shared-docs \
  --source-id collective-docs \
  --state-root tmp/markdown-projection-state
node examples/markdown-projection/dist/cli.js verify \
  --source-id collective-docs \
  --state-root tmp/markdown-projection-state
```

This is intentionally not live AFFiNE yet. The JSON sink is the proof harness
for the source/registry/custody behavior; the live AFFiNE writer should replace
only the `AffineProjectionPort`.

## End-To-End Demo

Run:

```sh
pnpm demo:markdown-projection
```

The demo creates a mock naked Markdown repo under
`tmp/markdown-projection-demo/mock-rta-docs` with:

- `README.md`;
- `rta/concept.md`;
- `rta/status.md`, later renamed through Git to
  `rta/reports/current-status.md`.

Those files explain RTA conceptually and describe its status as a demo, not an
exhaustive status report. The operator then:

1. initializes the mock repo;
2. projects the Markdown files into the JSON AFFiNE stand-in;
3. saves registry state outside the source repo;
4. renames the status doc through Git;
5. projects again;
6. verifies that the renamed doc keeps the same AFFiNE projection identity.

The important proof is `renamedDocIdStable: true`.
