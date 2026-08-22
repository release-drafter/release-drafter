# Check PR

The Check PR action validates the current pull request against categories in the
repository's Release Drafter configuration.

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

A condition with `conventional` validates the title. A condition with labels
validates current labels. If one condition defines both, title and labels must
both match. The action ignores path predicates, and a path-only condition cannot
pass validation. If a `pre-exclude` category excludes the pull request by title
or label, the action reports it as skipped. An unconditional fallback category
cannot make the pull request valid by itself.
