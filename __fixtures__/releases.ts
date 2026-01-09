import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'

type Release = 'release.json'

export const getReleasePayload = (f: Release) =>
  readFileSync(path.join(path.dirname(import.meta.filename), 'releases', f), {
    encoding: 'utf8'
  })

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
