# Check PR

Checks the current pull request title and labels against the changelog and
version resolver categories in your normal Release Drafter configuration.

```yaml
name: Check PR

on:
  pull_request:
    types:
      [
        opened,
        edited,
        synchronize,
        reopened,
        labeled,
        unlabeled,
        ready_for_review,
      ]

permissions:
  contents: read

jobs:
  check-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: release-drafter/release-drafter/check-pr@v7
```

The action supports `pull_request` and `pull_request_target`. It reads the
current title and labels from the event payload and follows `_extends`
configuration chains. It never modifies the pull request.

Conditions containing `conventional` validate the title, while conditions with
configured labels validate the current labels. Both predicates are required
when they appear in the same condition. Path predicates are ignored, and
path-only conditions do not count. Pull requests excluded by title or label
pre-categories pass as skipped. Pull requests that select only an unconditional
fallback category fail validation.
