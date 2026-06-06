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
