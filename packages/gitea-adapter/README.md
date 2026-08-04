# @release-drafter/gitea-adapter

Private workspace package implementing `@release-drafter/core`'s `ForgeAdapter`
contract for Gitea. It is not published or selected by the public facade yet.

`GiteaAdapter` is a thin branded facade over the shared Gitea-compatible
`@release-drafter/rest-adapter` implementation and profile factory. The shared
profile declares the `/api/v1` endpoints, `Authorization: token ...`
authentication, pagination and response field names, draft-release capability,
and qualified-ref normalization required for compatibility across Gitea
versions.

Implemented operations include complete commit comparisons, direct merged pull
request association, bounded changed-file and contributor-history pagination,
branch/pull/tag resolution including annotated tags, release listing, and draft
release creation/update.
