# @release-drafter/gitlab-adapter

This private workspace package implements the `ForgeAdapter` contract for
GitLab.com and self-managed GitLab instances. The package is not published
separately.

The adapter keeps `@gitbeaker/rest` behind an internal client boundary. Public
declarations expose only Release Drafter types, adapter options, limits, and
`GitLabAdapter`. GitBeaker clients, wire types, and requester types are not part
of the package API.

## Behavior and safety

- Uses `repository.serverUrl` or an explicit `serverUrl` and `apiUrl`. It
  normalizes the `/api/v4` endpoint and encodes namespace and project
  identifiers.
- Routes GitBeaker requests through the injected native `fetch` transport. One
  transport handles host selection, `PRIVATE-TOKEN` authentication, timeouts,
  cancellation, retries, response size limits, request limits, request IDs, and
  rate limit metadata.
- Limits comparison commits, associated merge requests, pages, list items,
  changed files, requests, retries, and concurrent detail requests.
- Uses complete comparison commits when `compare_timeout` indicates that only
  the diff is incomplete. It rejects missing comparison commits, capped or
  invalid changed file counts, incomplete changed file responses, and
  pagination that exceeds a configured limit.
- Redacts the complete token before truncating response text in errors.
- Finds all merged merge requests for each commit without depending on API
  response order. It requests optional body, URL, target branch, source branch,
  changed file, and contributor fields only when needed.
- Uses GitLab's `first_contribution` field and never treats a commit author name
  or a user's display name as a GitLab username.
- Resolves branches, tags, and `refs/merge-requests/<iid>/{head,merge}` refs.
  It excludes upcoming releases and normalizes published GitLab releases as
  non-draft, non-prerelease releases. It uses `released_at` for release order
  when the field is available.

GitLab Releases do not have a draft state, so `capabilities.draftReleases` is
`false`. The core returns a proposed release without writes when `publish` is
`false`. When `publish` is `true`, the core creates or updates the GitLab
Release.
