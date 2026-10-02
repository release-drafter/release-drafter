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

## Outputs

| Output   | Description                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `labels` | A JSON array of unique, sorted PR labels matched by configuration conditions. Empty results are `[]`. |

The action sets `labels` after loading configuration and evaluating the PR,
before reporting validation success, a skip, or a failure. It uses the same
projected conditions as validation: path predicates are ignored. Only labels
present on the PR and matched by a successful condition are returned. Unrelated
labels and labels from failed conditions or unselected categories are omitted.
Title-only and fallback matches add no labels. For a skipped PR, matching
pre-include and pre-exclude labels explain the skip; changelog and
version-resolver categories are not selected.

Unsupported or malformed events and configuration-loading failures do not set
the output. PR labels reflect the event snapshot; run Check PR after Autolabeler
in a subsequent event to see labels added by that action.

```yaml
- uses: release-drafter/release-drafter/check-pr@v7
  id: check
- name: Check user service
  if: contains(fromJSON(steps.check.outputs.labels), 'api/user')
  run: ./check-user-service.sh
```

Later steps normally run only when validation succeeds. To inspect labels after
validation fails, use `if: always()` or an appropriate failure condition.
