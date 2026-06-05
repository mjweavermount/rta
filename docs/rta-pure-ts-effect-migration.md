# RTA Pure TypeScript And Effect Migration

Status: source purge complete; Effect refactor still active

## Goal

RTA should converge on pure TypeScript source with Effect TS as the runtime
model wherever behavior, IO, trust, persistence, logging, review, scheduling,
or generated app execution is involved.

Allowed JavaScript after this migration:

- ignored build output under `dist/`
- package manager or tool output under ignored directories

Disallowed tracked source:

- `.mjs`
- `.js`
- `.cjs`

## Current Source Gate

`pnpm check:pure-ts` runs `rta check --pure-ts`.

`docs/rta-pure-ts-allowlist.txt` is intentionally empty. The check fails if a
tracked JS/MJS/CJS source file exists in the worktree.

## Completed Purge

- The root `.mjs` CLI has been removed.
- Legacy root `.mjs` packages have been removed or superseded by TypeScript packages.
- Legacy Node `.mjs` tests have been removed in favor of package-local Vitest tests.
- The meeting digest proof now lives under `examples/meeting-digest`.
- `pnpm check` includes the pure TypeScript source gate.

## Effect Migration Order

1. Runtime services: run store, artifact store, review queue, scheduler queue,
   operation event sink, provenance store, clock, id generator.
2. Repository services: base repository, in-memory implementation, file-backed
   implementation, typed repository errors. Initial implementation landed in
   `@rta/runtime`; generated app wiring and atomic snapshot envelopes remain.
3. Edge-boundary services: file-system boundary, path policy, raw payload
   parser, schema validator, trust promotion. Initial schema/file boundaries
   landed in `@rta/runtime`; HTTP/SQL/connector boundaries remain.
4. Secret services: secret value type, redactor, secret store, reveal
   capability. Initial in-memory store and redacted logging landed; Vault/env
   patterns remain.
5. Generated app layers: local live layer and test layer.
6. CLI as a thin Effect runner.

## Done Means

- `pnpm check:pure-ts` passes with an empty allowlist.
- `pnpm check:production` passes.
- The minimum demo app proves in-memory and file-backed repositories through
  Effect services/layers.
