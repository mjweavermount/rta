# RTA Demo Coverage Map

This map links RTA work to the demo surface that should prove it.

## Current Cards

| Card | Work | Demo Coverage |
|---|---|---|
| `LAB-34` | Bootstrap repo | Direct source/doc acceptance: open repo and inspect seed files |
| `LAB-35` | Vocab, ARD, CLI skeleton | Direct CLI demo: run `rta init`, `rta context`, `rta check --ard-meta` in a fixture app |
| `LAB-36` | Derivation graph | Direct CLI demo: run `rta explain` and inspect a derivation graph for a fixture |
| `LAB-37` | Local extensions/upstreaming | Direct CLI demo: create local extension, run `rta check --extensions-local`, show upstream gaps |
| `LAB-38` | Use cases/scenarios/boundary coverage | Direct CLI demo: run a scenario and show boundary coverage report |
| `LAB-39` | Generated app CLI/runtime wiring | Proof-through-integration: `LAB-47` uses generated app CLI without bypassing runtime wiring |
| `LAB-40` | Meeting digest proving app | Direct app demo: run meeting digest scenario and inspect review output |
| `LAB-41` | Home-lab hosting adapter | Optional hosted demo: generate WorkloadApp intent; live deploy only after approval |
| `LAB-42` | Observability/log QA/Grafana | Proof-through-integration: demo run produces human-readable logs and, later, dashboard checks |
| `LAB-43` | Storage/queue/artifact/run-state ports | Proof-through-integration: scenario replay stores and reloads a run |
| `LAB-44` | Review identity/approval actor model | Proof-through-integration: review action records actor and audit trail |
| `LAB-45` | CI/package/release hygiene | Direct CI/check demo: run repo checks and inspect CI result |
| `LAB-46` | Agent playbook/docs | Source/doc acceptance: agent can follow playbook to perform the demo loop |
| `LAB-47` | End-to-end demo harness | Direct integration demo: run the smallest full RTA-authored app loop |
| `LAB-48` | Monitor/review/provenance UI scope | Direct UI/spec demo once UI exists; until then source/doc acceptance for UX scope |
| `LAB-49` | Work ledger/demo coverage tracking | Direct CLI/doc demo: show capability linked to Plane card and demo path |

## Principle

No capability should be accepted only because code exists. It must be tied to something Virgil can experience directly or through an integration demo.

