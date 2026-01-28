import { buildReleasePayload } from '../build-release-payload'
import { getOctokit } from 'src/common'
import { context } from '@actions/github'

export const createRelease = async (params: {
  releasePayload: Awaited<ReturnType<typeof buildReleasePayload>>
}) => {
  const octokit = getOctokit()
  const { releasePayload } = params

  return octokit.rest.repos.createRelease({
    owner: context.repo.owner,
    repo: context.repo.repo,
    target_commitish: releasePayload.targetCommitish,
    name: releasePayload.name,
    tag_name: releasePayload.tag,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.make_latest.toString() as 'true' | 'false'
  })
}
