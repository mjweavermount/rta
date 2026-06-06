# RTA Local Runtime And Deployment

RTA should be easy to run from Nix without borrowing toolchains from another
repository. The local runtime is owned by this repo. Home-lab deployment is an
adapter path, not a requirement for every RTA app.

## Local Nix Runtime

Use the repo flake for local development:

```bash
nix develop
pnpm install --frozen-lockfile
pnpm demo:affine-monitor
```

The same demo can be run without entering a shell:

```bash
nix run .#demo-affine-monitor
```

The production check can also be run through Nix:

```bash
nix run .#check-production
```

This keeps Node, pnpm, and helper tools local to the RTA repo instead of relying
on the core lab shell or another project.

## Deployment Position

RTA apps should not be required to deploy to Virgil's home lab. Local execution,
library use, CI checks, and other hosting targets must remain valid.

Home-lab deployment should be implemented as a platform adapter:

- RTA app authors define app behavior, vocabulary, logs, tests, and scenarios.
- The home-lab adapter turns a selected app into the lab's `WorkloadApp`
  contract.
- The lab repo owns Argo, routing, persistence, backup, restore, and live
  observability declarations.
- RTA can generate or validate draft deployment metadata, but the lab remains
  the source of truth for live delivery.

## Current Two-App Demo

The current local proof is:

```text
AFFiNE ops gateway -> .rta/runs artifact bundle -> RTA monitor
```

The gateway writes:

- `state.json`
- `readable.log`
- `operation-events.jsonl`
- `receipts.jsonl`

The monitor reads those artifacts and can list runs, show one run, find failures,
and tail human-readable logs.

## What "Just Deploy It" Means

Deploying the current demo is possible, but it should be done deliberately. The
next deployable shape should be one of these:

1. A long-running AFFiNE ops gateway service with real AFFiNE credentials and a
   health endpoint.
2. A monitor service that reads a mounted run-artifact volume or Loki-backed log
   source and exposes a small web or CLI surface.
3. A combined internal-only demo deployment that proves routing, logs, health,
   and artifact visibility without production write access.

For home-lab deployment, add a draft app in `home-lab-v7` with:

- `deploy/apps/<app>/app.yaml`
- `deploy/apps/<app>/application.yaml`
- manifests or Helm/Kustomize output
- internal route only
- Authentik in front if browser-visible
- explicit secret source
- declared run-artifact storage
- health checks
- logs enabled
- a demo checklist that proves the gateway run appears in the monitor

Do not expose real AFFiNE write tools until the gateway has a dry-run mode, a
human approval boundary, and fail-closed credential handling.
