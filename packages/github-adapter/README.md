# @release-drafter/github-adapter

Private, authentication-bound GitHub implementation of the forge-neutral
`@release-drafter/core` ports. The adapter owns Octokit construction, REST and
GraphQL endpoint derivation for GitHub.com and GHES, retries, pagination, proxy
handling, response normalization, comparison hydration, release writes, and
flat repository config retrieval.

Transport is GraphQL-first. Commit, pull request, contributor, changed-file,
and ref hydration use GraphQL. REST remains only where the GitHub GraphQL schema
cannot provide equivalent behavior:

- `compareCommitsWithBasehead` defines the exact arbitrary ref/SHA/tag and
  non-linear comparison set. GraphQL `Ref.compare` cannot resolve all of these
  ranges correctly.
- Releases are listed through REST because GraphQL `Release` omits
  `target_commitish` and `upload_url`, which are required for filtering and
  normalized Action outputs.
- Release create/update uses REST because GitHub's GraphQL `Mutation` type has
  no release write mutations.
- Repository config uses REST raw media because GraphQL `Blob.text` can be null
  or truncated and cannot preserve raw response bytes. REST also preserves the
  existing 404/content-type diagnostics and GHES base64 object fallback.

```ts
import { createGitHubAdapter } from '@release-drafter/github-adapter'

const adapter = createGitHubAdapter({
  token: process.env.GITHUB_TOKEN!,
  serverUrl: process.env.GITHUB_SERVER_URL,
  apiUrl: process.env.GITHUB_API_URL,
  graphqlUrl: process.env.GITHUB_GRAPHQL_URL,
  logger,
})

const releases = await adapter.listReleases({ repository })
```

Every operation receives an explicit core `Repository`. The adapter itself is
connection-bound and repository-stateless. Tests can inject either a complete
Octokit client or a fetch implementation.
