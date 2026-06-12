# Issue Tracking

RTA planning should use GitHub Issues as the executable work queue while the repo
is primarily hosted on GitHub.

## What Belongs In Issues

Use issues for work that is ready to be tracked:

- refactor slices
- build phases
- bugs and regressions
- technical-debt follow-up
- design questions that need a decision
- human-review tasks with acceptance criteria
- candidate-upstream promotion work

Do not use issues as the raw idea swamp. Keep early messy thinking in docs such
as `ideation_spam.md`, then promote stable work into issues.

## Relationship To Docs

- `docs/refactor/*.md` contains the thinking, specs, requirements, and roadmap.
- GitHub Issues contain actionable slices of work.
- Issue bodies should link back to the relevant refactor docs.
- Closing an issue should either implement the slice or explicitly update the
  docs with the reason it changed.

## Phase 0 Tracking

Phase 0 is not a one-time task. Track it in two ways:

- Phase 0A issues: minimum coherence work needed before serious build phases.
- Phase 0B issues: eternal cleanup lane discovered while building later phases.

Phase 0B issues should name the weirdness directly and attach it to the phase or
feature that exposed it.

## Gitea Migration Assumption

If RTA moves from GitHub to Gitea later, assume a one-way, one-time migration of
issues is acceptable. Perfect bidirectional sync is not a goal.

GitHub may remain a break-glass offsite backup or mirror if the lab and standard
backups fail. Cleanup after a disaster restore is acceptable.

Planning implication:

- keep issue content clear enough to survive export/import
- avoid relying on GitHub-only project automation as the source of truth
- keep durable requirements in repo docs
- prefer labels and issue bodies over fragile board-only state

## Suggested Labels

- `phase-0a`
- `phase-0b`
- `phase-1`
- `phase-2`
- `phase-3`
- `phase-4`
- `phase-5`
- `phase-6`
- `phase-7`
- `phase-8`
- `phase-9`
- `phase-10`
- `phase-11`
- `workbench`
- `source-renderer`
- `concept-model`
- `wiring-graph`
- `canvas`
- `hud`
- `observable-cli`
- `playhead`
- `probe-runner`
- `candidate-upstream`
- `technical-debt`
- `decision`

