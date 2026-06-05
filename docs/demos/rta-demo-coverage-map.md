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

## Principle

No capability should be accepted only because code exists. It must be tied to something Virgil can experience directly or through an integration demo.
