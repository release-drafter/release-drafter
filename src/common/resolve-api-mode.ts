import process from 'node:process'

/**
 * Decides whether to drive a forge through REST only, because it has no GraphQL
 * API.
 *
 * Resolution runs most-specific first, and never inspects a version number: what
 * matters is whether a GraphQL endpoint exists, not which build is serving it.
 *
 * 1. An explicit choice from `--rest` or the library option always wins.
 * 2. The API URL, which describes the *target*. GitHub serves `api.github.com`,
 *    GitHub Enterprise Server serves REST at `/api/v3` and GraphQL at
 *    `/api/graphql`; Gitea and Forgejo serve REST at `/api/v1` and have no
 *    GraphQL at all, so the path segment separates them.
 * 3. `GITHUB_GRAPHQL_URL`, which describes the *host*. Gitea and Forgejo runners
 *    set it empty while GitHub populates it, so an empty value means the
 *    surrounding forge has no GraphQL. It is checked after the API URL precisely
 *    because the two can disagree — running this inside a Gitea job against
 *    github.com leaves it empty even though the target does have GraphQL.
 * 4. Otherwise assume GraphQL, matching the unconfigured `api.github.com` default.
 *
 * A forge that later ships GraphQL is picked up automatically at step 3 once its
 * runner populates the variable.
 */
export const resolveRestOnly = (
  options: {
    /** From `--rest`, or the `restOnly` library option. */
    explicit?: boolean
    apiUrl?: string
    /** Defaults to `GITHUB_GRAPHQL_URL`; pass `null` to ignore the environment. */
    graphqlUrl?: string | null
  } = {},
): boolean => {
  if (options.explicit !== undefined) return options.explicit

  const fromApiUrl = restOnlyFromApiUrl(options.apiUrl)
  if (fromApiUrl !== undefined) return fromApiUrl

  const graphqlUrl =
    options.graphqlUrl === undefined
      ? process.env.GITHUB_GRAPHQL_URL
      : options.graphqlUrl
  if (typeof graphqlUrl === 'string') return graphqlUrl.trim() === ''

  return false
}

const restOnlyFromApiUrl = (apiUrl?: string) => {
  if (!apiUrl) return undefined

  let url: URL
  try {
    url = new URL(apiUrl)
  } catch {
    return undefined
  }

  if (url.hostname === 'api.github.com' || url.hostname === 'github.com') {
    return false
  }

  // Trailing slashes are common in hand-written API URLs.
  const path = url.pathname.replace(/\/+$/, '')
  if (path.endsWith('/api/v3')) return false
  if (path.endsWith('/api/v1')) return true

  return undefined
}
