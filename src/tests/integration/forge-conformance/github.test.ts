import { vi } from 'vitest'
import {
  GitHubAdapter,
  type GitHubOctokit,
} from '../../../../packages/github-adapter/src/index.ts'
import { defineForgeAdapterConformance } from './contract.ts'

const repository = {
  owner: 'release-drafter',
  name: 'release-drafter',
  serverUrl: 'https://github.com',
}

const baselineRelease = {
  id: 1,
  tag_name: 'v1.0.0',
  name: 'Version 1.0.0',
  target_commitish: 'main',
  draft: false,
  prerelease: false,
  html_url:
    'https://github.com/release-drafter/release-drafter/releases/tag/v1.0.0',
}
const releases = [baselineRelease]
const releaseBodies = new Map([[baselineRelease.id, 'Baseline release.']])

const listReleases = vi.fn()
const compareCommitsWithBasehead = vi.fn()
const createRelease = vi.fn(async (request: Record<string, unknown>) => {
  const release = {
    id: releases.length + 1,
    tag_name: String(request.tag_name),
    name: String(request.name),
    target_commitish: String(request.target_commitish),
    draft: Boolean(request.draft),
    prerelease: Boolean(request.prerelease),
    html_url: `https://github.com/release-drafter/release-drafter/releases/tag/${String(request.tag_name)}`,
  }
  releases.push(release)
  releaseBodies.set(release.id, String(request.body))
  return { data: release }
})
const updateRelease = vi.fn(async (request: Record<string, unknown>) => {
  const release = releases.find(({ id }) => id === Number(request.release_id))
  if (!release)
    throw new Error(`Release ${String(request.release_id)} not found`)
  Object.assign(release, {
    tag_name: String(request.tag_name),
    name: String(request.name),
    target_commitish: String(request.target_commitish),
    draft: Boolean(request.draft),
    prerelease: Boolean(request.prerelease),
  })
  releaseBodies.set(release.id, String(request.body))
  return { data: release }
})

const paginate = Object.assign(
  vi.fn(async (method: unknown) => {
    if (method === listReleases) return releases
    throw new Error('Unexpected GitHub pagination request')
  }),
  {
    iterator: vi.fn((method: unknown, request: { basehead?: string }) => {
      if (
        method !== compareCommitsWithBasehead ||
        request.basehead !== 'v1.0.0...refs/tags/v1.1.0'
      ) {
        throw new Error('Unexpected GitHub comparison request')
      }
      return (async function* () {
        yield { data: { commits: [{ sha: 'merge-oid' }] } }
      })()
    }),
  },
)

const graphql = vi.fn(
  async (_query: string, variables: Record<string, unknown>) => {
    if (variables.expression === 'refs/tags/v1.0.0^{commit}') {
      return {
        repository: { object: { __typename: 'Commit', oid: 'base-oid' } },
      }
    }
    if (variables.number === 7) {
      return {
        repository: {
          pullRequest: {
            headRefOid: 'head-oid',
            mergeCommit: { oid: 'merge-oid' },
          },
        },
      }
    }
    if (variables.headRef === 'refs/tags/v1.1.0^{commit}') {
      return {
        repository: {
          object: {
            __typename: 'Commit',
            history: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: 'commit-node',
                  oid: 'merge-oid',
                  committedDate: '2026-08-04T00:00:00Z',
                  message: 'Merge pull request #7',
                  author: {
                    name: 'Octo Cat',
                    user: { login: 'octocat' },
                  },
                  associatedPullRequests: {
                    nodes: [
                      {
                        number: 7,
                        title: 'Exercise shared conformance',
                        body: 'Shared contract coverage for GitHub.',
                        url: 'https://github.com/release-drafter/release-drafter/pull/7',
                        mergedAt: '2026-08-04T00:00:00Z',
                        baseRefName: 'main',
                        headRefName: 'feature/conformance',
                        baseRepository: {
                          nameWithOwner: 'release-drafter/release-drafter',
                        },
                        isCrossRepository: false,
                        author: {
                          __typename: 'User',
                          login: 'octocat',
                          url: 'https://github.com/octocat',
                        },
                        labels: { nodes: [{ name: 'feature' }] },
                        merged: true,
                        mergeCommit: { oid: 'merge-oid' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      }
    }
    throw new Error(
      `Unexpected GitHub GraphQL variables: ${JSON.stringify(variables)}`,
    )
  },
)

const octokit = {
  rest: {
    repos: {
      listReleases,
      compareCommitsWithBasehead,
      createRelease,
      updateRelease,
      getContent: vi.fn(),
    },
    pulls: { listFiles: vi.fn() },
  },
  paginate,
  graphql,
} as unknown as GitHubOctokit

const adapter = new GitHubAdapter({ token: 'not-a-real-token', octokit })

defineForgeAdapterConformance({
  name: 'GitHub mocked protocol',
  adapter,
  extensions: {
    inspectReleaseBody: async (release) =>
      releaseBodies.get(Number(release.id)) ?? '',
  },
  fixture: {
    repository,
    capabilities: { draftReleases: true },
    baselineRelease: {
      id: baselineRelease.id,
      tagName: baselineRelease.tag_name,
      name: baselineRelease.name,
      targetCommitish: baselineRelease.target_commitish,
      draft: false,
      prerelease: false,
    },
    commitishCases: [
      { commitish: 'refs/heads/main', expected: 'main' },
      { commitish: 'refs/tags/v1.0.0', expected: 'base-oid' },
      { commitish: 'refs/pull/7/head', expected: 'head-oid' },
      { commitish: 'refs/pull/7/merge', expected: 'merge-oid' },
      { commitish: 'direct-oid', expected: 'direct-oid' },
    ],
    findChanges: {
      comparison: { baseRef: 'v1.0.0', headRef: 'refs/tags/v1.1.0' },
      pullRequestFields: {
        body: true,
        url: true,
        baseRefName: true,
        headRefName: true,
      },
      pullRequestLimit: 20,
      historyLimit: 100,
      includeChangedFiles: false,
      includeNewContributors: false,
      expectedCommitOids: ['merge-oid'],
      expectedPullRequests: [
        {
          number: 7,
          title: 'Exercise shared conformance',
          body: 'Shared contract coverage for GitHub.',
          url: 'https://github.com/release-drafter/release-drafter/pull/7',
          mergedAt: '2026-08-04T00:00:00Z',
          baseRefName: 'main',
          headRefName: 'feature/conformance',
          baseRepository: 'release-drafter/release-drafter',
          isCrossRepository: false,
          author: {
            login: 'octocat',
            url: 'https://github.com/octocat',
            type: 'User',
          },
          labels: ['feature'],
          mergeCommitOid: 'merge-oid',
        },
      ],
      expectedNewContributorLogins: [],
    },
    createPayload: {
      tag: 'v1.1.0',
      name: 'Version 1.1.0',
      body: 'Created by shared conformance.',
      targetCommitish: 'main',
      draft: true,
      prerelease: false,
      makeLatest: true,
    },
    expectedCreatedRelease: {
      tagName: 'v1.1.0',
      name: 'Version 1.1.0',
      targetCommitish: 'main',
      draft: true,
      prerelease: false,
    },
    updatePayload: {
      tag: 'v1.1.0',
      name: 'Version 1.1.0 updated',
      body: 'Updated by shared conformance.',
      targetCommitish: 'release',
      draft: false,
      prerelease: true,
      makeLatest: false,
    },
    expectedUpdatedRelease: {
      tagName: 'v1.1.0',
      name: 'Version 1.1.0 updated',
      targetCommitish: 'release',
      draft: false,
      prerelease: true,
    },
  },
})
