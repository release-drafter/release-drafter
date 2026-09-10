# @release-drafter/gitea-adapter

This private workspace package implements the `ForgeAdapter` contract for
Gitea. The package is not published separately.

`GiteaAdapter` configures the shared `@release-drafter/rest-adapter`
implementation for Gitea. The profile defines `/api/v1` endpoints,
`Authorization: token ...` authentication, pagination fields, response fields,
draft release support, and ref normalization. Gitea requires this normalization
for compatibility between versions.

The adapter supports commit comparisons, merged pull request lookup, and
pagination for changed files and contributor history. It also resolves branches
and tags, lists releases, and creates or updates draft releases. Tag resolution
supports annotated tags.
