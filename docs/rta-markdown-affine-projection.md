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

For shared documents, the canonical path is:

```text
hosted Git Markdown repo
  -> collaborator clone/edit/commit/push
  -> projection runner clone/pull checkout
  -> external projection registry
  -> bot-owned read-only AFFiNE docs
```

The projection runner may run on a laptop during a spike, but the authority is
the hosted Git repo, not the laptop checkout. A local checkout is only a working
copy. AFFiNE is only the projected reading/canvas surface.

## Live Lab Store

On 2026-06-06, the mock RTA docs were moved from the local bare-repo demo into
Gitea on the tower-backed lab:

```text
canonical remote: http://100.64.0.1:30087/virgil-admin/rta-mock-docs.git
public app URL:   https://git.virgil.info/virgil-admin/rta-mock-docs
```

Until the edge route is refreshed, use the mesh URL for clone/pull operations.
The public URL is the intended app URL once `git.virgil.info` is wired through
edge Traefik.

Current local checkouts:

```text
collaborator checkout:
  tmp/markdown-projection-gitea/collaborator-checkout/rta-mock-docs

projector checkout:
  tmp/markdown-projection-gitea/projector-checkout/rta-mock-docs
```

The live AFFiNE projection reads from the projector checkout, which was cloned
from Gitea. Collaborators should edit a clone of the Gitea repo, push, then let
the projector checkout pull before projection.

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
`tmp/markdown-projection-demo` with:

- `hosted-git/mock-rta-docs.git`: bare canonical Git remote;
- `collaborator-checkout/mock-rta-docs`: simulated human/agent checkout;
- `projector-checkout/mock-rta-docs`: projection runner checkout;
- `projection-state/mock-rta-docs`: external registry and fake AFFiNE sink.

The canonical remote contains:

- `README.md`;
- `rta/concept.md`;
- `rta/status.md`, later renamed through Git to
  `rta/reports/current-status.md`.

Those files explain RTA conceptually and describe its status as a demo, not an
exhaustive status report. The operator then:

1. initializes a bare hosted-style Git remote;
2. clones it into a collaborator checkout;
3. commits and pushes the initial Markdown docs;
4. clones it into a separate projector checkout;
5. projects the Markdown files from the projector checkout into the JSON AFFiNE
   stand-in;
6. saves registry state outside the source repo;
7. renames the status doc in the collaborator checkout and pushes;
8. fetches/resets the projector checkout;
9. projects again;
10. verifies that the renamed doc keeps the same AFFiNE projection identity.

The important proof is `renamedDocIdStable: true`.

To inspect or edit the demo as a collaborator:

```sh
open tmp/markdown-projection-demo/collaborator-checkout/mock-rta-docs
```

To inspect the projection runner's checked-out source:

```sh
open tmp/markdown-projection-demo/projector-checkout/mock-rta-docs
```

To inspect the canonical local-hosted remote:

```sh
open tmp/markdown-projection-demo/hosted-git
```

## Live AFFiNE Spike

On 2026-06-06 the mock RTA docs demo was projected into live AFFiNE through the
home-lab checkpointed projection operator.

Checkpoint created before mutation:

```text
before-rta-mock-projection
```

Target:

```text
AFFiNE / Agent Workspace / projected-markdown / mock-rta-docs
```

Live projected documents:

```text
Mock RTA Knowledge Base
docId: obs-7e4f7e5e777db89b
source: README.md

RTA Conceptual Overview
docId: obs-4ebea47d834a628f
source: rta/concept.md

RTA Status
docId: obs-b8bf8f06776754b3
source: rta/reports/current-status.md
```

Verified database posture:

```text
public=false
mode=0
defaultRole=30
summary starts with "Markdown/Git read-only projection"
```

This is still a bridge step. It proves the projection concept against live
AFFiNE, but the live writer is currently the home-lab operator script rather
than an RTA-owned `AffineProjectionPort` implementation.
