# Check PR Title

Checks the current pull request title against the conventional changelog and
version resolver categories in your normal Release Drafter configuration.

```yaml
name: Check PR title

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
  pull-requests: read

jobs:
  check-title:
    runs-on: ubuntu-latest
    steps:
      - uses: release-drafter/release-drafter/check-pr-title@v7
```

The action supports `pull_request` and `pull_request_target`. It reads the
current title from the event payload, follows `_extends` configuration chains,
and fetches changed files only when configured category conditions require
them. It never modifies the pull request.

Labels and paths remain correlated with `conventional` when they appear in the
same `when` condition. Pull requests excluded by pre-categories pass as skipped.
Titles that select only an unconditional fallback category fail validation.
