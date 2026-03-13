import { readFileSync } from 'node:fs'
import path from 'node:path'
import nock from 'nock'
import { mocks } from '.'

/**
 * Available files in fixtures/pull_requests
 */
type Files = 'files'

const getPrFilesPayload = (f: Files) =>
  JSON.parse(
    readFileSync(
      path.join(
        path.dirname(import.meta.filename),
        '../fixtures/pull_requests',
        `${f}.json`,
      ),
      {
        encoding: 'utf8',
      },
    ),
  )

export const nockGetPrFiles = (params: {
  files: Files
  pr?: { owner: string; repo: string; number: number }
}) => {
  const { pr, files } = params || {}

  return nock('https://api.github.com')
    .get(
      `/repos/${pr?.owner || 'release-drafter'}/${pr?.repo || 'release-drafter'}/pulls/${pr?.number || 1475}/files`,
    )
    .query(true)
    .reply(200, getPrFilesPayload(files))
}

export const nockPostPrLabels = (params: {
  pr?: { owner: string; repo: string; number: number }
}) => {
  const { pr } = params || {}

  return nock('https://api.github.com')
    .post(
      `/repos/${pr?.owner || 'release-drafter'}/${pr?.repo || 'release-drafter'}/issues/${pr?.number || 1475}/labels`,
      mocks.postPrLabelsBody,
    )
    .reply(201)
}
