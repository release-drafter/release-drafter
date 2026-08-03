# @release-drafter/gitea-adapter

Private workspace package implementing `@release-drafter/core`'s `ForgeAdapter`
contract for Gitea. It is not published or selected by the public facade yet.

`GiteaAdapter` is a thin explicit profile over
`@release-drafter/rest-adapter`. The profile declares Gitea's `/api/v1`
endpoints, `Authorization: token ...` authentication, pagination and response
field names, and draft-release capability.

Implemented operations include complete commit comparisons, direct merged pull
request association, bounded changed-file and contributor-history pagination,
branch/pull/tag resolution including annotated tags, release listing, and draft
release creation/update.
