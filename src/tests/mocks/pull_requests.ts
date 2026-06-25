import { readFileSync } from 'node:fs'
import path from 'node:path'
import nock from 'nock'
import { mocks } from './hoisted.ts'

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

const nockSinglePrFiles = (params: {
  files?: Files
  filenames?: string[]
  pr?: { owner: string; repo: string; number: number }
}) => {
  const { pr, files, filenames } = params
  const payload = filenames
    ? filenames.map((filename) => ({ filename }))
    : getPrFilesPayload(files || 'files')

  return nock('https://api.github.com')
    .get(
      `/repos/${pr?.owner || 'release-drafter'}/${pr?.repo || 'release-drafter'}/pulls/${pr?.number || 1475}/files`,
    )
    .query(true)
    .reply(200, payload)
}

export function nockGetPrFiles(params: {
  files?: Files
  filenames?: string[]
  pr?: { owner: string; repo: string; number: number }
}): nock.Scope
export function nockGetPrFiles(params: {
  prs: Array<{
    pr: { owner: string; repo: string; number: number }
    filenames: string[]
  }>
}): nock.Scope[]
export function nockGetPrFiles(params: {
  repo?: { owner: string; repo: string }
  entries: Array<[number, string[]]>
}): nock.Scope[]
export function nockGetPrFiles(params: {
  files?: Files
  filenames?: string[]
  pr?: { owner: string; repo: string; number: number }
  prs?: Array<{
    pr: { owner: string; repo: string; number: number }
    filenames: string[]
  }>
  repo?: { owner: string; repo: string }
  entries?: Array<[number, string[]]>
}): nock.Scope | nock.Scope[] {
  if (params.entries) {
    const { repo } = params

    return params.entries.map(([number, filenames]) =>
      nockSinglePrFiles({
        pr: {
          owner: repo?.owner || 'release-drafter',
          repo: repo?.repo || 'release-drafter',
          number,
        },
        filenames,
      }),
    )
  }

  if (params.prs) {
    return params.prs.map(({ pr, filenames }) =>
      nockSinglePrFiles({ pr, filenames }),
    )
  }

  return nockSinglePrFiles(params)
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
