import type { ParsedConfig } from '#src/actions/drafter/config/index.ts'
import { getGitHubAdapter, getRepository } from './get-github-adapter.ts'

export const parseCommitishForRelease = async (
  commitish: ParsedConfig['commitish'],
) => {
  return getGitHubAdapter().resolveCommitish({
    repository: getRepository(),
    commitish,
  })
}
