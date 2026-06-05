# Meeting Digest Local Demo

This is the current end-to-end RTA proving demo.

## Run

```bash
node scripts/rta.mjs demo run --high
```

The command runs the second meeting digest implementation through the RTA
scenario/runtime/log/review path.

To use a different transcript:

```bash
node examples/meeting-digest-seed/bin/meeting-digest.mjs --input path/to/transcript.txt --review --high
```

## Compare Implementations

The repo intentionally keeps three meeting digest implementations:

- `meeting-digest-v1.mjs`: first spiral pass, block-oriented and simple.
- `meeting-digest-v2.mjs`: rebuilt digest engine with topic loopback merging,
  touchstone inference, Markdown output, and task classification.
- `meeting-digest-integrated.mjs`: post-RTA rebuild that uses the app
  declaration and derivation graph, then annotates extracted work with RTA
  obligations.

Generate and run the integrated app CLI:

```bash
node scripts/rta.mjs generate app-cli
node .rta/generated/meeting-digest/meeting-digest.mjs --input tests/fixtures/custom-transcript.txt --review --high
```

The integrated output should include `version: integrated-v3`, RTA vocabulary,
use cases, derived obligations, and task-level `rtaObligations`.

## Review

The demo prints a review id:

```text
review=review-...
```

Approve it locally:

```bash
node scripts/rta.mjs review approve <review-id> --actor Virgil
```

## Publish Dry Run

Publication is blocked until review is approved:

```bash
node scripts/rta.mjs publish dry-run <review-id> --target fixture
```

This writes only a local `.rta/published/*.json` proof artifact. It performs no
AFFiNE, Plane, GitHub, or home-lab write.

## Optional Hosting Intent

Generate home-lab adapter intent without deploying:

```bash
node scripts/rta.mjs hosting render meeting-digest
```

This writes `.rta/hosting/meeting-digest.workload-app.yaml`.

Generate a full draft WorkloadApp package:

```bash
node scripts/rta.mjs hosting package meeting-digest
```

Validate an isolated draft against Virgil's home-lab contract:

```bash
node scripts/rta.mjs hosting package meeting-digest --lab-root /Users/virgil/Developer/Virgil-Info/home-lab-v7/tmp/rta-workload-root
cd /Users/virgil/Developer/Virgil-Info/home-lab-v7
WORKLOAD_APPS_DIR=tmp/rta-workload-root/tmp/workload-apps nix develop --command scripts/test/integrity/workload-apps.rb
```

## Scheduler And Queue

```bash
node scripts/rta.mjs queue enqueue meeting-digest.integrated.fixture --input tests/fixtures/custom-transcript.txt --review
node scripts/rta.mjs queue run-next
node scripts/rta.mjs queue list
```

## Grafana Dashboard

```bash
node scripts/rta.mjs grafana render meeting-digest
```

This writes `.rta/grafana/meeting-digest.dashboard.json`.

## Security Checks

```bash
node scripts/rta.mjs check --security
```

The current security layer enforces repo-contained transcript input paths and
redacts secret-like values from ceremony logs.

## Artifacts

Each run writes:

- `meeting-digest-v2.json`
- `meeting-digest-v2.md`
- `logs.json`
- `provenance.json`
