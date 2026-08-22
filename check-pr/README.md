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
    runs-on: ubuntu-slim
    steps:
      - uses: release-drafter/release-drafter/check-pr@v7
```

The action supports the `pull_request` and `pull_request_target` events. It
reads the title and labels from the event payload. It also resolves `_extends`
configuration chains. The action does not modify the pull request.

A condition that contains `conventional` validates the title. A condition that
contains `label` or `labels` validates the current labels. If a condition
contains both types of rule, the title and labels must match.

The action does not evaluate `path` or `paths`. A condition that contains only
path rules cannot pass validation. A matching `pre-exclude` category skips the
pull request. A fallback category without a `when` condition does not make the
pull request valid.
