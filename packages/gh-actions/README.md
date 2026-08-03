# @release-drafter/gh-actions

Private workspace that owns GitHub Actions runtime composition. It is not
published.

The Drafter and Autolabeler remain separate products with distinct source
entrypoints, package exports, and root `dist/actions/*/run.js` artifacts. Shared
Action Toolkit, configuration loading, GitHub adapter, GHES, and proxy wiring
lives here without routing either Action through the public package or CLI
facades.
