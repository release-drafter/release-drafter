# @release-drafter/github-adapter

This private workspace package implements the `ForgeAdapter` contract for
GitHub. It creates Octokit clients and derives REST and GraphQL endpoints for
GitHub.com and GitHub Enterprise Server. It also handles retries, pagination,
proxies, response mapping, release operations, and repository configuration.

The adapter uses GraphQL to load commits, pull requests, contributors, changed
files, and refs. It uses REST only when GraphQL cannot provide the required
data:

- `compareCommitsWithBasehead` returns the comparison commit OIDs for arbitrary
  refs, SHAs, tags, and non-linear histories. GraphQL `Ref.compare` cannot
  resolve all of these comparisons.
- The adapter lists releases through REST. GraphQL `Release` omits
  `target_commitish`, which the adapter uses for filtering, and `upload_url`,
  which Release Drafter uses for action outputs.
- The adapter creates and updates releases through REST. GitHub's GraphQL
  `Mutation` type has no release mutations.
- The adapter loads repository configuration through REST raw media. GraphQL
  `Blob.text` can be null or truncated and cannot return the exact raw bytes.
  REST also provides the required 404 and content-type checks and the GHES
  base64 fallback.

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

Every operation receives a core `Repository`. The adapter stores connection
settings but does not store repository state. Tests can inject an Octokit client
or a `fetch` implementation.
