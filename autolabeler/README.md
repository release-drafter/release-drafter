# Autolabeler action

This directory contains the public action entrypoint for Autolabeler. Use the
repository root to run the Drafter action.

```yaml
steps:
  # Runs Autolabeler.
  - uses: release-drafter/release-drafter/autolabeler@v7
  # Runs Drafter.
  - uses: release-drafter/release-drafter@v7
```
