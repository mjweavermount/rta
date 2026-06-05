# RTA Pure TypeScript And Effect Migration

Status: active migration plan

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

## Current Migration Rail

`pnpm check:pure-ts` runs `rta check --pure-ts`.

During the migration it uses `docs/rta-pure-ts-allowlist.txt` as an explicit
burn-down list. The check fails if a new tracked JS/MJS/CJS file appears outside
that allowlist, and it reports the remaining allowlisted count.

When the allowlist is empty, the check becomes a hard no-JS source gate.

## Purge Order

1. Move the active root CLI from `scripts/rta.mjs` into `packages/cli/bin/rta.ts`.
2. Port root production checks from `packages/*.mjs` into TypeScript packages.
3. Port legacy Node tests from `tests/*.test.mjs` into package-local Vitest tests.
4. Replace `examples/meeting-digest-seed/*.mjs` with TypeScript proving apps.
5. Delete the allowlist and make pure TS a release gate.

## Effect Migration Order

1. Runtime services: run store, artifact store, review queue, scheduler queue,
   operation event sink, provenance store, clock, id generator.
2. Repository services: base repository, in-memory implementation, file-backed
   implementation, typed repository errors.
3. Edge-boundary services: file-system boundary, path policy, raw payload
   parser, schema validator, trust promotion.
4. Secret services: secret value type, redactor, secret store, reveal
   capability.
5. Generated app layers: local live layer and test layer.
6. CLI as a thin Effect runner.

## Done Means

- `git ls-files '*.js' '*.mjs' '*.cjs'` returns no tracked source files.
- `pnpm check:pure-ts` passes without an allowlist.
- `pnpm check:production` passes.
- The minimum demo app proves in-memory and file-backed repositories through
  Effect services/layers.
