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

## Safety behavior

Comparison responses are rejected when they time out, exceed byte or commit
limits, omit completeness metadata, or contain fewer commits than advertised.
Pagination is rejected when configured page/item/request bounds are reached
before completion can be proven. If bounded history cannot prove that a pull
request author is a new contributor, the adapter emits a warning and does not
mark that author as new.

## Bundle impact

This package and its current consumers are private workspace packages. They are
not wired into `release-drafter`, the CLI, or GitHub Actions, so they add no code
to the existing public facade or tracked Action bundles in this stack layer.
