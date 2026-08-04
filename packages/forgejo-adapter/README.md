# @release-drafter/forgejo-adapter

Private workspace package implementing `@release-drafter/core`'s `ForgeAdapter`
contract for Forgejo. It is not published or selected by the public facade yet.

`ForgejoAdapter` is a thin branded facade over the shared Gitea-compatible
`@release-drafter/rest-adapter` implementation and profile factory. Forgejo
currently uses the same `/api/v1` endpoints, authentication, pagination,
response fields, and release capability as Gitea, but preserves fully qualified
branch and tag refs because Forgejo supports them. The branded entrypoint
remains available for further API divergence.

Implemented operations include complete commit comparisons, direct merged pull
request association, bounded changed-file and contributor-history pagination,
branch/pull/tag resolution including annotated tags, release listing, and draft
release creation/update.
