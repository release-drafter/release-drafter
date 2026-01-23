# Autolabeler action

This folder only serves as an alias when users reference the action, which requires the presence of the [`action.yml`](./action.yml) file

```yaml
steps:
  # runs autolabeler
  - uses: release-drafter/release-drafter/autolabeler@latest
  # ⚠️ targets root `action.yaml` - runs drafter
  - uses: release-drafter/release-drafter@latest
```