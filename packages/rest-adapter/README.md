# @release-drafter/rest-adapter

Private workspace package containing forge-neutral, GitHub-compatible REST
protocol mechanics for `@release-drafter/core`'s `ForgeAdapter` port. It is not
published or selected by the public facade yet.

The package accepts an explicit profile and provides:

- native `fetch` transport with configurable server/API URLs, authentication,
  logger, timeout, response-size, request, page, item, commit, and concurrency
  bounds
- complete comparison validation using `total_commits`
- direct merged-PR discovery through each comparison commit
- normalized commits, pull requests, labels, optional fields, changed files,
  contributor status, refs/tags, and releases
- conservative new-contributor detection using bounded, author-filtered pull
  request history
- token redaction in transport and HTTP errors

Profiles own endpoint paths, authentication syntax, pagination names, response
field names, and capabilities. Shared code contains no forge-name branching.
The package exports a Gitea-compatible profile factory for the REST contract
currently shared by Gitea and Forgejo. Their branded entrypoints remain thin
facades over the shared adapter factory, preserving independently evolvable
package boundaries and bound adapter methods. Each adapter owns its profile
instance so later divergence does not introduce shared mutable state. Fully
qualified branch refs are normalized to branch names because Gitea release APIs
do not accept values such as `refs/heads/main`.

## Safety behavior

Comparison responses are rejected when they time out, exceed byte or commit
limits, omit completeness metadata, or contain fewer commits than advertised.
Pagination is rejected when configured page/item/request bounds are reached
before completion can be proven. If bounded history cannot prove that a pull
request author is a new contributor, the adapter emits a warning and does not
mark that author as new.

Contributor `historyLimit` values are sent as the requested pagination window,
not used as a total-item ceiling. Independent adapter item, page, and request
bounds still apply. Valid total-count headers take precedence over short pages,
which supports servers that cap responses below the requested page size.

The bounded defaults allow at most 499 comparison commits within the 500-request
operation budget and at most 1,000 changed files, matching both the list-item
bound and the default 20-page by 50-item pagination capacity.

## Declarations

Workspace builds emit declarations for the factory, public profile/options/
limits types, and the concrete Gitea and Forgejo classes and profiles. Package
type entrypoints therefore match their runtime entrypoints instead of exposing
only package identity constants.

## Bundle impact

This package and its current consumers are private workspace packages. They are
not wired into `release-drafter`, the CLI, or GitHub Actions, so they add no code
to the existing public facade or tracked Action bundles in this stack layer.
