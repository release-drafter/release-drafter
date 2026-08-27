# @release-drafter/forgejo-adapter

This private workspace package implements the `ForgeAdapter` contract for
Forgejo. The package is not published separately.

`ForgejoAdapter` configures the shared `@release-drafter/rest-adapter`
implementation for Forgejo. Forgejo uses the same `/api/v1` endpoints,
authentication, pagination fields, response fields, and release support as
Gitea. The Forgejo profile preserves fully qualified branch and tag refs and can
define Forgejo-specific overrides.

The adapter supports commit comparisons, merged pull request lookup, and
pagination for changed files and contributor history. It also resolves branches
and tags, lists releases, and creates or updates draft releases. Tag resolution
supports annotated tags.
