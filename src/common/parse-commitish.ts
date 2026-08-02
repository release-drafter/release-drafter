import type { ParsedConfig } from '#src/actions/drafter/config/index.ts'
import { getGitHubAdapter, getRepository } from './get-github-adapter.ts'
import type { Octokit } from './get-octokit.ts'

/**
 * Temporary compatibility wrapper. The GitHub adapter owns commitish resolution;
 * an explicitly supplied Octokit client remains supported for existing tests.
 */
export const parseCommitishForRelease = async (
  commitish: ParsedConfig['commitish'],
  octokit?: Octokit,
) => {
  const adapter = getGitHubAdapter(octokit)
  return adapter.resolveCommitish({
    repository: getRepository(),
    commitish,
  })
}
