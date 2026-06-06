# RTA MCP And AFFiNE Artifact Vocabulary

Status: seed vocabulary from the deprecated home-lab MCP gateway migration.

The old `home-lab-v7` MCP gateway proved useful behavior, but it was not an
RTA-authored app. The replacement splits the behavior into two RTA apps:

- `mcp-auth-layer`: shared MCP transport, Authentik identity, policy,
  credential custody, and downstream routing.
- `affine-mcp-rta`: AFFiNE-specific garden context, artifact growth, source
  workbench, and output staging tools.

## Vocabulary To Upstream

### Artifact Growth

Artifact growth is the domain language for "online `/output`":

- grow durable specs, GDDs, articles, research briefs, decisions, task sets,
  and indexes from conversation;
- avoid raw chat archive duplication;
- read nearby docs and indexes before creating or appending;
- return receipts that explain whether the write posture is direct, staged, or
  protected.

Canonical pattern seed:

```text
fixtures/golden/pass/patterns/artifact-growth.pattern.yaml
```

### Source Workbench

Source workbench is the language for the agent tooling the user expects around
source and `/output`:

- explore/search nearby source and docs;
- produce diff plans;
- stage inline edits with target, preview, and receipt;
- stage generated output artifacts.

Canonical pattern seed:

```text
fixtures/golden/pass/patterns/source-workbench.pattern.yaml
```

### MCP Auth Layer

The MCP auth layer is a generic app, not an AFFiNE app. It owns:

- inbound MCP transport;
- Authentik actor normalization;
- tool policy;
- credential resolution and redaction;
- downstream service routing;
- audit/operation receipts.

The downstream service app owns domain tools. For AFFiNE, that means the AFFiNE
app owns garden context, document/index semantics, and artifact growth.

## Replacement Rule

Do not add new features to the deprecated home-lab MCP gateway. Salvage useful
behavior into RTA packages/examples, then promote the replacement through an
optional home-lab hosting adapter.
