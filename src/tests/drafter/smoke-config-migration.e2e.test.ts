import nock from 'nock'
import { describe, expect, it, vi } from 'vitest'
import { runDrafter } from '#tests/helpers/index.ts'
import type { AvailableConfigs } from '#tests/mocks/config.ts'
import {
  getGqlPayload,
  mockContext,
  mockInput,
  mocks,
  nockGetReleases,
} from '#tests/mocks/index.ts'

const runSmokeConfigDryRun = async (params: {
  config: AvailableConfigs
  releaseFiles: Array<'release' | 'release-draft'>
}) => {
  await mockContext('push')
  await mockInput('dry-run', 'true')
  mocks.config.mockReturnValue(params.config)

  const comparisonPayload = getGqlPayload('graphql-comparison-merge-commit')
  const commits = comparisonPayload.data.repository.ref.compare.commits.nodes
    .filter(Boolean)
    .map((commit: { id: string; oid?: string }) => ({
      ...commit,
      oid: commit.oid ?? commit.id,
    }))
  const comparisonScope = nock('https://api.github.com')
    .get(/\/repos\/[^/]+\/[^/]+\/compare\//)
    .query(true)
    .reply(200, {
      commits: commits.map((commit: { oid: string }) => ({ sha: commit.oid })),
    })
  const gqlScope = nock('https://api.github.com')
    .post('/graphql', (body) =>
      body.query.includes('query hydrateComparisonCommits'),
    )
    .reply(200, {
      data: {
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: commits,
            },
          },
        },
      },
    })
    .post('/graphql', (body) =>
      body.query.includes('query findRecentMergedPullRequests'),
    )
    .reply(200, {
      data: {
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      },
    })
  const releaseScope = nockGetReleases({
    releaseFiles: params.releaseFiles,
  })

  await runDrafter()

  expect(releaseScope.isDone()).toBe(true)
  expect(comparisonScope.isDone()).toBe(true)
  expect(gqlScope.pendingMocks().length).toBe(0)
  expect(mocks.postReleaseBody).not.toHaveBeenCalled()
  expect(mocks.patchReleaseBody).not.toHaveBeenCalled()
  expect(mocks.core.setFailed).not.toHaveBeenCalled()

  return {
    outputs: [...mocks.core.setOutput.mock.calls],
    dryRunMessages: mocks.core.info.mock.calls
      .flat()
      .filter((message) => message.includes('[dry-run]')),
  }
}

describe('smoke config migration e2e', () => {
  it.each([
    ['create', ['release']],
    ['update', ['release', 'release-draft']],
  ] as const)('produces identical dry-run outputs for legacy and migrated smoke configs on %s', async (_mode, releaseFiles) => {
    const legacy = await runSmokeConfigDryRun({
      config: 'config-with-smoke-test-categories-legacy',
      releaseFiles: [...releaseFiles],
    })

    vi.clearAllMocks()

    const migrated = await runSmokeConfigDryRun({
      config: 'config-with-smoke-test-categories-migrated',
      releaseFiles: [...releaseFiles],
    })

    expect(migrated).toEqual(legacy)
    expect(migrated.outputs).toMatchInlineSnapshot(`
        [
          [
            "tag_name",
            "v2.0.1",
          ],
          [
            "name",
            "v2.0.1",
          ],
          [
            "resolved_version",
            "2.0.1",
          ],
          [
            "major_version",
            "2",
          ],
          [
            "minor_version",
            "0",
          ],
          [
            "patch_version",
            "1",
          ],
          [
            "body",
            "# What's Changed

        ## Other changes

        * Update dependencies (#4) @TimonVS
        * Bug fixes (#3) @TimonVS
        * Add big feature (#2) @TimonVS
        * 👽 Add alien technology (#1) @TimonVS

        **Full Changelog**: https://github.com/toolmantim/release-drafter-test-project/compare/v2.0.0...v2.0.1
        ",
          ],
        ]
      `)
  })
})
