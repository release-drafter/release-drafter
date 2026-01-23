# Drafter action

This folder only serves as an alias when users reference the action, which requires the presence of the [`action.yml`](./action.yml) file

```yaml
steps:
  # targets root `action.yaml` - runs drafter
  - uses: release-drafter/release-drafter@latest
  # also runs drafter
  - uses: release-drafter/release-drafter/drafter@latest
```