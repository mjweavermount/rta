# RTA Demo Coverage Map

This map links RTA work to the demo surface that should prove it.

## Current Work

| Work ID | Optional Mirror | Work | Demo Coverage |
|---|---|---|---|
| `repo-bootstrap` | `LAB-34` | Bootstrap repo | Direct source/doc acceptance: open repo and inspect seed files |
| `vocab-ard-cli-skeleton` | `LAB-35` | Vocab, ARD, CLI skeleton | Direct CLI demo: run `rta init`, `rta context`, `rta check --ard-meta` in a fixture app |
| `derivation-graph` | `LAB-36` | Derivation graph | Direct CLI demo: run `rta explain` and inspect a derivation graph for a fixture |
| `local-extensions-upstreaming` | `LAB-37` | Local extensions/upstreaming | Direct CLI demo: create local extension, run `rta check --extensions-local`, show upstream gaps |
| `use-case-scenario-coverage` | `LAB-38` | Use cases/scenarios/boundary coverage | Direct CLI demo: run a scenario and show boundary coverage report |
| `generated-app-cli-runtime-wiring` | `LAB-39` | Generated app CLI/runtime wiring | Proof-through-integration: `end-to-end-demo-harness` uses generated app CLI without bypassing runtime wiring |
| `meeting-digest-proving-app` | `LAB-40` | Meeting digest proving app | Direct app demo: run meeting digest scenario and inspect review output |
| `home-lab-hosting-adapter` | `LAB-41` | Home-lab hosting adapter | Optional hosted demo: generate WorkloadApp intent; live deploy only after approval |
| `observability-log-qa-grafana` | `LAB-42` | Observability/log QA/Grafana | Proof-through-integration: demo run produces human-readable logs and, later, dashboard checks |
| `runtime-ports` | `LAB-43` | Storage/queue/artifact/run-state ports | Proof-through-integration: scenario replay stores and reloads a run |
| `review-identity-approval` | `LAB-44` | Review identity/approval actor model | Proof-through-integration: review action records actor and audit trail |
| `ci-package-release-hygiene` | `LAB-45` | CI/package/release hygiene | Direct CI/check demo: run repo checks and inspect CI result |
| `agent-playbook-docs` | `LAB-46` | Agent playbook/docs | Source/doc acceptance: agent can follow playbook to perform the demo loop |
| `end-to-end-demo-harness` | `LAB-47` | End-to-end demo harness | Direct integration demo: run the smallest full RTA-authored app loop |
| `monitor-review-provenance-ui` | `LAB-48` | Monitor/review/provenance UI scope | Direct UI/spec demo once UI exists; until then source/doc acceptance for UX scope |
| `work-ledger` | `LAB-49` | Work ledger/demo coverage tracking | Direct CLI/doc demo: show capability linked to optional mirror and demo path |
| `scheduler-queue` | local | Persistent scheduler/queue | Direct CLI demo: enqueue a meeting digest job, run next, inspect completed queue state |
| `security-hardening` | local | Generic security guardrails | Direct test/CLI demo: escaping input paths fail, secret-like log fields are redacted, `rta check --security` passes |
| `rta-prod-00-rebaseline-ledger` | local | Rebaseline overclaimed work | Direct doc/CLI demo: inspect `docs/spec-to-ticket-backlog.md`, run `rta check --work-ledger`, confirm broad old capabilities are no longer marked complete |
| `rta-prod-01-cli-command-surface` | local | Full CLI command surface | Direct CLI demo: run required command inventory including `doctor`, `dev`, `test-scenario`, `extensions`, and `upstream` |
| `rta-prod-02-tier-vocab-contracts` | local | Tier/vocab contracts | Direct fixture demo: good/bad T1/T2/T3 fixtures pass/fail `rta check --tier-contracts`, `--pattern-contracts`, and `--archetype-bindings` |
| `rta-prod-03-ard-spirit-letter-loop` | local | ARD spirit/letter loop | Direct fixture demo: reciprocal ARD families pass and broken families fail `rta check --ard-meta` |
| `rta-prod-04-derivation-engine` | local | Central derivation engine | Direct CLI/demo snapshot: `rta explain graph` shows stable source chains for obligations, logs, review gates, tests, and runtime contracts |
| `rta-prod-05-generators-generated-sync` | local | Generators and generated-sync | Direct fixture demo: `rta generate` emits classified files with derivation hashes and `rta check --generated-sync` catches drift |
| `rta-prod-06-check-production` | local | Production check gate | Direct negative fixture demo: `rta check --production` fails missing obligations, stale generation, unsafe connectors, and missing review gates |
| `rta-prod-07-usecase-scenario-boundary` | local | Use-case/scenario/boundary coverage | Direct fixture demo: executable scenarios prove use cases and declared bounded-context edges |
| `rta-prod-08-runtime-unit-of-work` | local | Runtime unit of work | Direct CLI demo: run, replay, simulated time, queue/worker, artifacts, and provenance all use one runtime contract |
| `rta-prod-09-observability-telemetry` | local | Observability and telemetry | Direct CLI/dashboard demo: derived operation event contracts, telemetry coverage, and watch mode correlate with provenance |
| `rta-prod-10-review-connector-safety` | local | Review and connector safety | Direct negative fixture demo: external writes fail without declared connector policy and approved review artifact |
| `rta-prod-11-generated-app-runtime-wiring` | local | Generated app runtime wiring | Proof-through-integration: generated app CLI, scenario runner, worker, and production process use the same AppRuntime contract |
| `rta-prod-12-meeting-digest-seed` | local | Meeting digest seed rebuild | Direct app demo: generated meeting digest app turns transcript into reviewable digest and extracted work without handmade bypasses |
| `rta-prod-13-hosting-adapter-live` | local/home-lab | Hosting adapter live path | Optional hosted demo: host-neutral intent, containerized app, WorkloadApp validation, healthcheck, and optional lab promotion |
| `rta-prod-14-docs-agent-experience` | local | Agent docs and experience | Source/doc acceptance: a fresh agent can follow AGENTS/docs/CLI output to continue work without rediscovery |
| `rta-prod-15-package-release` | local | Package/release hygiene | Direct CI/demo: production checks, package exports, audit/dependency hygiene, and release workflow pass |

## Principle

No capability should be accepted only because code exists. It must be tied to something Virgil can experience directly or through an integration demo.
