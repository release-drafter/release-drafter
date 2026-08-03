# @release-drafter/gitlab-adapter

Private GitLab implementation of `@release-drafter/core`'s normalized
`ForgeAdapter`. It supports GitLab.com and self-managed hosts and is not
published or selected by the public facade yet.

The adapter keeps the exact `@gitbeaker/rest@43.8.0` dependency behind an
internal client boundary. Public declarations expose only Release Drafter
types, adapter options, limits, and `GitLabAdapter`. GitBeaker clients, wire
types, and requester types are not part of the package API.

## Behavior and safety

- Uses the repository `serverUrl`, or an explicit `serverUrl`/`apiUrl`, with a
  normalized `/api/v4` endpoint and encoded namespace/project identifiers.
- Routes GitBeaker requests through the injected native `fetch` transport so
  host selection, `PRIVATE-TOKEN` authentication, timeout/abort handling,
  retries, response-size limits, request budgets, request IDs, and rate-limit
  metadata share one implementation.
- Bounds comparison commits, associated merge requests, pages, list items,
  changed files, requests, retries, and concurrent hydration.
- Continues from complete comparison commits when `compare_timeout` reports only
  incomplete diffs, while rejecting missing comparison commits, capped or invalid
  changed-file counts, incomplete changed-file responses, and pagination whose
  completion cannot be proven within bounds.
- Redacts the complete token before truncating response text in errors.
- Discovers zero, one, or multiple merged merge requests per commit without
  depending on API response order. Optional body, URL, target/source branch,
  changed-file, and contributor fields are hydrated only when requested.
- Uses GitLab's `first_contribution` field and never treats a commit author name
  or a user's display name as a GitLab username.
- Resolves branches, `refs/merge-requests/<iid>/{head,merge}`, and tags, and
  excludes upcoming releases, and normalizes published GitLab releases as
  non-draft, non-prerelease releases using `released_at` for chronology when
  available.

GitLab has no draft Release state, so `capabilities.draftReleases` is `false`.
Core therefore calculates and returns a proposed release without writes when
`publish: false`; `publish: true` creates or updates the GitLab Release.

## Bundle impact

The built private package is 485,032 bytes unminified and 85,657 bytes with
`gzip -9`. These exact byte counts were measured after a clean package build:

```sh
rm -rf packages/gitlab-adapter/dist
npm run build --workspace @release-drafter/gitlab-adapter
wc -c < packages/gitlab-adapter/dist/index.js
gzip -9 -c packages/gitlab-adapter/dist/index.js | wc -c
```

The single `dist/index.js` bundle contains the GitBeaker REST/core requester code.
The public `release-drafter` facade and tracked Action bundles do not import this
workspace in this stack layer, so their chunk composition and sizes are unchanged.
