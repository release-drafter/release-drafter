# @release-drafter/forgejo-adapter

Private workspace package implementing `@release-drafter/core`'s `ForgeAdapter`
contract for Forgejo. It is not published or selected by the public facade yet.

`ForgejoAdapter` is a thin explicit profile over
`@release-drafter/rest-adapter`. The profile independently declares Forgejo's
`/api/v1` endpoints, `Authorization: token ...` authentication, pagination and
response field names, and draft-release capability, even where those values
currently match Gitea.

Implemented operations include complete commit comparisons, direct merged pull
request association, bounded changed-file and contributor-history pagination,
branch/pull/tag resolution including annotated tags, release listing, and draft
release creation/update.
