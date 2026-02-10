import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'
import { mocks } from '.'

/**
 * Available files in fixtures/releases
 */
type Release =
  | 'release'
  | 'release-2'
  | 'release-3'
  | 'release-draft'
  | 'pre-release'
  | 'release-shared-commit-date'

export const getReleasePayload = (f: Release) =>
  JSON.parse(
    readFileSync(
      path.join(
        path.dirname(import.meta.filename),
        '../fixtures/releases',
        f + '.json'
      ),
      {
        encoding: 'utf8'
      }
    )
  )

export const nockGetReleases = (params: {
  releaseFiles: Release[]
  repo?: { owner: string; repo: string }
}) => {
  const { repo, releaseFiles } = params || {}

  return nock('https://api.github.com')
    .get(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases`
    )
    .query(true)
    .reply(
      200,
      releaseFiles.map((f) => getReleasePayload(f))
    )
}

export const nockPostRelease = (params?: {
  replyRelease?: Release
  repo?: { owner: string; repo: string }
}) => {
  const { repo, replyRelease } = params || {}

  const postScope = nock('https://api.github.com')
    .post(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases`,
      mocks.postReleaseBody
    )
    .reply(200, getReleasePayload(replyRelease || 'release'))

  return postScope
}

export const nockGetAndPostReleases = (params: {
  fetchedReleases: Release[]
  replyRelease?: Release
  repo?: { owner: string; repo: string }
}) => {
  const { repo, replyRelease, fetchedReleases } = params || {}

  return nock('https://api.github.com')
    .get(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases`
    )
    .query(true)
    .reply(
      200,
      fetchedReleases.map((f) => getReleasePayload(f))
    )
    .post(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases`,
      mocks.postReleaseBody
    )
    .reply(200, getReleasePayload(replyRelease || 'release'))
}

export const nockGetAndPatchReleases = (params: {
  fetchedReleases: Release[]
  replyRelease?: Release
  repo?: { owner: string; repo: string }
}) => {
  const { repo, replyRelease, fetchedReleases } = params || {}

  return nock('https://api.github.com')
    .get(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases`
    )
    .query(true)
    .reply(
      200,
      fetchedReleases.map((f) => getReleasePayload(f))
    )
    .patch(
      new RegExp(
        `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/releases/\\d+`
      ),
      mocks.patchReleaseBody
    )
    .reply(200, getReleasePayload(replyRelease || 'release'))
}
