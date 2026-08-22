# @release-drafter/rest-adapter

This private workspace package contains the shared REST implementation for
Gitea-compatible `ForgeAdapter` instances. The package is not published
separately.

The package accepts an explicit profile and provides:

- native `fetch` transport with configurable server and API URLs,
  authentication, logging, timeouts, response size limits, request limits,
  pagination limits, commit limits, and concurrency limits
- complete comparison validation using `total_commits`
- merged pull request lookup for each comparison commit
- normalized commits, pull requests, labels, optional fields, changed files,
  contributor status, refs/tags, and releases
- conservative new-contributor detection within the configured,
  author-filtered pull request history
- token redaction in transport and HTTP errors

Profiles define endpoint paths, authentication syntax, pagination fields,
response fields, and capabilities. Shared code does not select behavior from a
forge name. The package exports the profile factory that Gitea and Forgejo use.
Each forge package configures the shared adapter factory and owns its profile
instance. Separate instances prevent shared mutable state.

The profile controls the handling of fully qualified branch and tag refs. Gitea
normalizes refs for versions that require short branch names or commit SHAs.
Forgejo preserves the full refs that it supports.

## Safety behavior

The adapter rejects comparison responses that time out or exceed response size
or commit limits. It also rejects responses that omit completeness metadata or
contain fewer commits than reported. The adapter rejects pagination when a page,
item, or request limit is reached before the final page.

If the configured history limit cannot confirm a new contributor, the adapter
emits a warning. It does not mark the pull request author as new.

The adapter sends contributor `historyLimit` values as the requested page size.
The value is not a total item limit. The adapter's item, page, and request limits
still apply. Valid total count headers take precedence over short pages. This
supports servers that return fewer items than the requested page size.

The default limits permit 499 comparison commits within the 500-request
operation limit. They also permit 1,000 changed files, which matches the item
limit and the default capacity of 20 pages with 50 items per page.

## Declarations

Workspace builds emit declarations for the factory, public profile types,
option types, limit types, and concrete Gitea and Forgejo classes and profiles.
Package type entrypoints match the runtime entrypoints.
