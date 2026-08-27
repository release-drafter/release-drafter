# Drafter action

This directory contains an alternative public entrypoint for the Drafter
action. The repository root runs the same action.

```yaml
steps:
  - uses: release-drafter/release-drafter@v7
  # This entrypoint is equivalent to the repository root.
  - uses: release-drafter/release-drafter/drafter@v7
```
