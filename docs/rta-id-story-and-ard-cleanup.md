# RTA ID Story And ARD Cleanup

Status: design note for the next implementation pass

## Why This Exists

RTA needs an ID story strong enough that an operator can follow a run through
primitive invocations, messages, queues, adapters, readable logs, monitor views,
and future hosted observability without guessing.

The current implementation has a useful seed:

- `OperationScope` has `operationId`, `traceId`, and `spanId`.
- instrumented generic primitives emit `correlationId`, `causationId`, and
  `messageId` derived from the scope.
- runtime runs have `runId`, unit-of-work IDs, provenance nodes, and parent step
  links.
- readable trace logs project some correlation fields.

That is not yet RTA-grade. Some primitive families do not carry the full ID
envelope, generated handlers use weak placeholder trace values in places, and
local app artifacts such as the AFFiNE gateway do not yet use the same canonical
execution IDs.

## Canonical ID Envelope

RTA should define one canonical execution ID envelope and require it on every
structured operation event.

```ts
interface ExecutionIds {
  readonly runId?: string
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly operationId: string
  readonly correlationId: string
  readonly causationId: string
  readonly messageId?: string
  readonly primitiveId: string
  readonly invocationId: string
}
```

Meaning:

- `runId`: user-visible run, scenario, job, or session.
- `traceId`: distributed trace. Usually follows the run, but may cross runs
  when queued work continues a prior cause.
- `spanId`: this primitive invocation.
- `parentSpanId`: the primitive invocation that directly caused this invocation.
- `operationId`: the domain operation being attempted.
- `correlationId`: the broad "why these are related" chain.
- `causationId`: the direct cause.
- `messageId`: present when handling or emitting a command, event, or query.
- `primitiveId`: stable identity of the primitive definition.
- `invocationId`: unique identity for this invocation of the primitive.

## Primitive Contract

The base primitive should own the public invocation method. App code should not
emit operation events directly.

Descendants may customize:

- action summary
- reason
- input summary
- output summary
- boundary/system details
- redaction details
- app-specific diagnostics

Descendants may not customize away:

- ID envelope creation
- lifecycle phases
- timestamp capture
- failure capture
- trace/correlation propagation
- readable log projection

Required lifecycle phases for most primitives:

```text
received -> started -> completed
received -> started -> failed
```

Additional phases may exist for specialized primitives:

- `state-changed`
- `emitted`
- `staged`
- `committed`
- `rejected`

## Required Enforcement

Add a production check:

```bash
rta check --trace-context
```

The check should fail when:

- any primitive lifecycle event type lacks `ids`.
- any event omits required ID fields.
- any child invocation drops `traceId`.
- any child invocation omits `parentSpanId`.
- any emitted message lacks `messageId`.
- any queued job drops `correlationId` or `causationId`.
- generated code uses command/query/event tags as fake trace IDs.
- app source writes readable logs manually instead of projecting structured
  operation events.
- local run artifacts omit the canonical ID envelope.

Fold this into:

```bash
pnpm check:production
```

## Readable Log Projection

Readable logs should remain a projection of structured operation events.

Normal:

```text
[normal] AFFINE_DOC_READER Completed outbound adapter Read AFFiNE doc because read-only inspection is allowed
```

Trace:

```text
[trace] AFFINE_DOC_READER Completed outbound adapter Read AFFiNE doc because read-only inspection is allowed run=run_01 trace=tr_01 span=sp_04 parent=sp_03 op=affine.docRead corr=corr_01 cause=cmd_01 msg=evt_02 primitive=primitive:outbound-adapter:AffineDocReader invocation=inv_04
```

The monitor should be able to reconstruct a span tree from the structured
events and print a near-stack-trace view.

## ARD Placement

The ID story should become a runtime/observability ARD family, not just a doc.

Add root ARDs:

```text
ards/runtime/trace-context-spirit.ard.json
ards/runtime/execution-id-envelope.ard.json
ards/runtime/trace-log-projection.ard.json
```

Suggested IDs:

```text
ARD-RTA-TRACE-000
ARD-RTA-TRACE-ENVELOPE
ARD-RTA-TRACE-LOGS
```

`ARD-RTA-TRACE-000` should say:

> Every primitive invocation must be reconstructable from canonical execution
> IDs.

`ARD-RTA-TRACE-ENVELOPE` should require:

```bash
rta check --trace-context
```

`ARD-RTA-TRACE-LOGS` should require:

```bash
rta check --operation-event
rta check --trace-log-projection
```

The golden production fixture should also gain:

```text
fixtures/golden/pass/ards/ARD-017.ard.yaml
```

with:

```yaml
id: GOLDEN-ARD-017
kind: letter
family: fixture
name: Golden fixture trace context envelope
spirit: [GOLDEN-ARD-000]
severity: error
checks:
  - description: primitive events carry canonical trace context
    command: node ../../../packages/cli/dist/rta.js check --trace-context --root .
```

Then add `GOLDEN-ARD-017` to `GOLDEN-ARD-000.letters`.

## ARD System Cleanup

The ARD system needs cleanup before the ID story can be enforced cleanly.

Current split:

- root `ards/**/*.ard.json` are human-current design records.
- fixture `fixtures/golden/pass/ards/*.ard.yaml` are mechanically validated by
  the current CLI schema.

That split creates a footgun: a principle can be accepted in root ARDs without
being represented in the enforceable ARD loop.

Needed cleanup:

1. Choose one canonical ARD schema or explicitly support both JSON and YAML
   through one parser.
2. Expand ARD families so root ARDs can be validated without pretending they are
   only `ci`, `t1`, `t2`, `t3`, `fixture`, or `custom`.
3. Make root ARDs part of `rta check --ard-meta`.
4. Require every letter ARD to reference at least one concrete check, generator,
   fixture, or accepted exception.
5. Require every spirit ARD to list reciprocal letters.
6. Add `rta explain ards` so an agent can see which accepted principles are
   enforceable, which are only documented, and which are missing checks.
7. Add a production check that fails if an accepted ARD is not represented in
   either executable checks or an explicit waiver.

## Recommended Next Pass

Implement in this order:

1. ARD parser/schema cleanup.
2. root ARD metadata check.
3. trace-context ARDs.
4. `ExecutionIds` type and scope forking with `parentSpanId`.
5. lifecycle event schema migration to `ids`.
6. readable log trace projection upgrade.
7. generated code update.
8. AFFiNE gateway artifact update.
9. monitor span-tree view.
10. `rta check --trace-context` in production checks.

The core principle:

> Every piece of leaf code must be reachable from a primitive, every primitive
> must speak, and every spoken event must carry enough IDs to reconstruct cause,
> correlation, and span ancestry.
