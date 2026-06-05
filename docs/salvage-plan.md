# Salvage Plan

Initial sources to inspect:

- `/Users/virgil/Developer/Virgil-Info/home-lab-v7/vendor/rta-ddd-core`
- `/Users/virgil/Documents/Codex/2026-06-04/otter-ai-plugin-otter-ai-openai/work/rita-app-framework`

Pull forward deliberately:

- vocab schemas and parser
- ARD spirit/letter model
- ARD metadata validation
- CLI command shape
- golden fixture inventory
- T1/T2/T3 ARD families
- pattern and archetype specs
- obligation generation
- generated-sync checks
- vocab linting for description/guidance

Rewrite around:

- `packages/derivation`
- app-local extension enforcement
- use-case/scenario coverage
- generated app CLI and runtime wiring

Do not blindly pull:

- Rita naming
- placeholder ARDs as production truth
- meeting-specific assumptions into core
- home-lab assumptions into core
- Hermes assumptions

