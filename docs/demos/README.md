# RTA Demo Walkthroughs

RTA work should be demo-covered. A card can have a direct demo, or it can be proven by a later integration/demo card that uses its output.

This directory tracks the demo surfaces that make RTA work experiential.

## Demo Types

```text
direct demo
  Run a command, open a page, inspect generated output, or watch logs for the card itself.

proof-through-integration
  A later demo card proves this card by using its generated/runtime path.

source/doc acceptance
  The artifact is a spec, plan, or scaffold; acceptance is opening the artifact and confirming it is present and coherent.
```

## Current Demo Walkthroughs

- [LAB-34 Bootstrap Repo Demo](lab-34-bootstrap-repo-demo.md)
- [Demo Coverage Map](rta-demo-coverage-map.md)

## Human Review Rule

Every Human Review note should name demo coverage:

```md
Demo coverage:
- Direct demo: ...
- Proved by: LAB-xx ...
```

