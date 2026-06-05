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

## Artifacts

Each run writes:

- `meeting-digest-v2.json`
- `meeting-digest-v2.md`
- `logs.json`
- `provenance.json`
