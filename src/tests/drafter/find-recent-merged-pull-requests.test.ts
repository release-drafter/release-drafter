import { findRecentMergedPullRequests } from 'src/actions/drafter/lib/find-pull-requests/find-recent-merged-pull-requests'
import type { Octokit } from 'src/common/get-octokit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockContext } from '../mocks'

const OWNER = 'toolmantim'
const REPO = 'release-drafter-test-project'

const makePRNode = (
  overrides: Partial<{
    number: number
    title: string
    merged: boolean
    mergedAt: string | null
    mergeCommitOid: string | null
    labels: string[]
    authorLogin: string
    authorType: string
    isCrossRepository: boolean
  }> = {},
) => {
  const o = {
    number: 10,
    title: 'Add feature',
    merged: true,
    mergedAt: '2019-04-27T14:00:00Z',
    mergeCommitOid: 'abc123',
    labels: [],
    authorLogin: 'contributor',
    authorType: 'User',
    isCrossRepository: false,
    ...overrides,
  }
  return {
    __typename: 'PullRequest' as const,
    number: o.number,
    title: o.title,
    merged: o.merged,
    mergedAt: o.mergedAt,
    isCrossRepository: o.isCrossRepository,
    baseRepository: {
      __typename: 'Repository' as const,
      nameWithOwner: `${OWNER}/${REPO}`,
    },
    author: {
      __typename: o.authorType as 'User' | 'Bot',
      login: o.authorLogin,
      url: `https://github.com/${o.authorLogin}`,
    },
    labels: {
      __typename: 'LabelConnection' as const,
      nodes: o.labels.map((name) => ({ __typename: 'Label' as const, name })),
    },
    mergeCommit: o.mergeCommitOid
      ? { __typename: 'Commit' as const, oid: o.mergeCommitOid }
      : null,
  }
}

const makeGraphqlResponse = (nodes: ReturnType<typeof makePRNode>[]) => ({
  repository: {
    pullRequests: {
      __typename: 'PullRequestConnection',
      nodes,
    },
  },
})

const localMocks = vi.hoisted(() => ({
  graphql: vi.fn(),
}))

vi.mock(import('src/common/get-octokit'), async (iom) => {
  const om = await iom()
  process.env.GITHUB_TOKEN = 'test'
  return {
    ...om,
    getOctokit: () => ({
      ...om.getOctokit(),
      graphql: localMocks.graphql as unknown as Octokit['graphql'],
    }),
  }
})

const baseOpts = {
  withPullRequestBody: false,
  withPullRequestURL: false,
  withBaseRefName: false,
  withHeadRefName: false,
}

describe('findRecentMergedPullRequests', () => {
  beforeEach(async () => {
    await mockContext('push')
    localMocks.graphql.mockReset()
  })

  it('returns empty array when no recent PRs match comparison OIDs', async () => {
    localMocks.graphql.mockResolvedValueOnce(
      makeGraphqlResponse([makePRNode({ mergeCommitOid: 'deadbeef' })]),
    )

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123', 'def456']),
      foundPrKeys: new Set(),
    })

    expect(result).toEqual([])
  })

  it('returns empty array when matching PR is already in foundPrKeys', async () => {
    localMocks.graphql.mockResolvedValueOnce(
      makeGraphqlResponse([
        makePRNode({ number: 10, mergeCommitOid: 'abc123' }),
      ]),
    )

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123']),
      foundPrKeys: new Set([`${OWNER}/${REPO}#10`]),
    })

    expect(result).toEqual([])
  })

  it('returns empty array when mergeCommit is null', async () => {
    localMocks.graphql.mockResolvedValueOnce(
      makeGraphqlResponse([makePRNode({ mergeCommitOid: null })]),
    )

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123']),
      foundPrKeys: new Set(),
    })

    expect(result).toEqual([])
  })

  it('returns PR when mergeCommit.oid is in commitOids and PR is not found', async () => {
    localMocks.graphql.mockResolvedValueOnce(
      makeGraphqlResponse([
        makePRNode({
          number: 6,
          title: 'Add new feature',
          mergeCommitOid: 'abc123',
          labels: ['enhancement'],
          authorLogin: 'TimonVS',
        }),
      ]),
    )

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123']),
      foundPrKeys: new Set(),
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      __typename: 'PullRequest',
      number: 6,
      title: 'Add new feature',
      merged: true,
      baseRepository: { nameWithOwner: `${OWNER}/${REPO}` },
      labels: { nodes: [{ name: 'enhancement' }] },
      author: { login: 'TimonVS' },
    })
  })

  it('recovers multiple missing PRs', async () => {
    localMocks.graphql.mockResolvedValueOnce(
      makeGraphqlResponse([
        makePRNode({ number: 10, mergeCommitOid: 'sha-10' }),
        makePRNode({ number: 11, mergeCommitOid: 'sha-11' }),
        makePRNode({ number: 12, mergeCommitOid: 'sha-not-in-comparison' }),
      ]),
    )

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['sha-10', 'sha-11']),
      foundPrKeys: new Set(),
    })

    expect(result).toHaveLength(2)
    expect(result.map((pr) => pr?.number)).toEqual([10, 11])
  })

  it('returns empty array when repository has no pullRequests', async () => {
    localMocks.graphql.mockResolvedValueOnce({
      repository: {
        pullRequests: { __typename: 'PullRequestConnection', nodes: [] },
      },
    })

    const result = await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123']),
      foundPrKeys: new Set(),
    })

    expect(result).toEqual([])
  })

  it('calls GraphQL with correct variables', async () => {
    localMocks.graphql.mockResolvedValueOnce(makeGraphqlResponse([]))

    await findRecentMergedPullRequests({
      ...baseOpts,
      commitOids: new Set(['abc123']),
      foundPrKeys: new Set(),
    })

    expect(localMocks.graphql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        owner: OWNER,
        name: REPO,
        limit: 5,
        withPullRequestBody: false,
        withPullRequestURL: false,
        withBaseRefName: false,
        withHeadRefName: false,
      }),
    )
  })
})
