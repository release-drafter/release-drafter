import { getGitHubAdapter } from './get-github-adapter.ts'

/**
 * Temporary compatibility seam for legacy Action modules. Octokit construction,
 * endpoints, retry, pagination, and proxy behavior are owned by the GitHub adapter.
 */
export const getOctokit = () => getGitHubAdapter().octokit

export type Octokit = ReturnType<typeof getOctokit>
