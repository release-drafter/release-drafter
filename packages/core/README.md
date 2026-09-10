# @release-drafter/core

This private workspace package contains the forge-neutral Release Drafter
logic. The package is not published.

The package defines common data types for releases, commits, and pull requests.
It also contains configuration schemas, configuration merging, category
evaluation, pull request validation, changelog rendering, version calculation,
release planning, and dry-run protection. Runtime code must provide a `Logger`,
`Repository`, and `ForgeAdapter`.

Forge clients, GitHub Actions Toolkit modules, environment lookup, and API
response types do not belong in this package. Each adapter operation receives a
`Repository`. Adapters do not store repository state, and the core does not read
repository data from global state.

Each adapter declares whether its forge supports draft releases. If the forge
does not support drafts and `publish` is `false`, the core calculates the
release but does not write it. If `publish` is `true`, the core updates the
published release that has the generated tag.

`ReleaseInput.from` overrides only the change comparison baseline. Release
selection and automatic version calculation continue to use the selected
published release.
