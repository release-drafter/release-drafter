import type { GitHubContext } from '#src/common/index.ts'
import type { buildReleasePayload } from '../build-release-payload/index.ts'

export const createRelease = async (params: {
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
  github: Pick<GitHubContext, 'octokit' | 'repo'>
}) => {
  const { octokit, repo } = params.github
  const { releasePayload } = params

  return octokit.rest.repos.createRelease({
    owner: repo.owner,
    repo: repo.repo,
    target_commitish: releasePayload.targetCommitish,
    name: releasePayload.name,
    tag_name: releasePayload.tag,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.prerelease
      ? 'false'
      : (releasePayload.make_latest.toString() as 'true' | 'false'),
  })
}
