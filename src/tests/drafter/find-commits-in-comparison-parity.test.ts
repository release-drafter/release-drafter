import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCommitsInComparison } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts'
import { findCommitsInComparisonRest } from '#src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison-rest.ts'
import type { Octokit } from '#src/common/get-octokit.ts'
import { FindCommitsInComparisonDocument } from '#src/types/github.graphql.generated.ts'
import { testGitHubContext } from '#tests/mocks/index.ts'

/**
 * The GraphQL and REST comparison paths are two implementations of one contract:
 * every consumer downstream of `findPullRequests` is written against the GraphQL
 * shape, and the REST path hand-assembles that shape for forges with no GraphQL
 * API. Nothing in the type system ties them together — the REST builder satisfies
 * `ComparisonCommit` structurally, so a field added to the GraphQL fragment
 * compiles fine while the REST path silently yields `undefined` for it.
 *
 * These tests are that missing tie. One fixture describes a single repository
 * state, projected into both wire formats, and both paths must agree on it.
 */

const OWNER = 'octocat'
const REPO = 'example'
const NAME_WITH_OWNER = `${OWNER}/${REPO}`

const MERGE_SHA = 'a1a1a1a1'
const DIRECT_SHA = 'b2b2b2b2'
const MERGE_DATE = '2026-01-02T00:00:00Z'
const DIRECT_DATE = '2026-01-01T00:00:00Z'

const OCTOCAT = { login: 'octocat', name: 'The Octocat' }
const CONTRIBUTOR = { login: 'contributor', name: 'A Contributor' }

/**
 * A squash merge: the branch's second author survives only as a trailer, which is
 * the case where the two paths reach the same answer by different routes —
 * GraphQL resolves the trailer address, REST reads the pull request's own commits.
 */
const MERGE_MESSAGE = `feat: add a thing (#1)\n\nCo-authored-by: ${CONTRIBUTOR.name} <contributor@example.com>`
const DIRECT_MESSAGE = 'chore: a commit pushed straight to the branch'

const PULL_REQUEST = {
  number: 1,
  title: 'Add a thing',
  body: 'The body of the pull request.',
  url: `https://github.com/${NAME_WITH_OWNER}/pull/1`,
  mergedAt: MERGE_DATE,
  baseRefName: 'main',
  headRefName: 'feature',
  label: 'feature',
}

// --- GraphQL projection -----------------------------------------------------

const gitActor = (person: { login: string; name: string }) => ({
  __typename: 'GitActor',
  name: person.name,
  user: { __typename: 'User', login: person.login },
})

const graphqlPullRequestNode = {
  __typename: 'PullRequest',
  title: PULL_REQUEST.title,
  number: PULL_REQUEST.number,
  url: PULL_REQUEST.url,
  body: PULL_REQUEST.body,
  author: {
    __typename: 'User',
    login: OCTOCAT.login,
    url: `https://github.com/${OCTOCAT.login}`,
  },
  baseRepository: { __typename: 'Repository', nameWithOwner: NAME_WITH_OWNER },
  mergedAt: PULL_REQUEST.mergedAt,
  isCrossRepository: false,
  labels: {
    __typename: 'LabelConnection',
    nodes: [{ __typename: 'Label', name: PULL_REQUEST.label }],
  },
  merged: true,
  baseRefName: PULL_REQUEST.baseRefName,
  headRefName: PULL_REQUEST.headRefName,
}

const graphqlCommits = [
  {
    __typename: 'Commit',
    // An opaque relay id, deliberately unlike the sha; see the parity assertion.
    id: 'C_kwDOabcdef',
    oid: MERGE_SHA,
    committedDate: MERGE_DATE,
    message: MERGE_MESSAGE,
    author: gitActor(OCTOCAT),
    authors: {
      __typename: 'GitActorConnection',
      nodes: [gitActor(OCTOCAT), gitActor(CONTRIBUTOR)],
    },
    associatedPullRequests: {
      __typename: 'PullRequestConnection',
      nodes: [graphqlPullRequestNode],
    },
  },
  {
    __typename: 'Commit',
    id: 'C_kwDOfedcba',
    oid: DIRECT_SHA,
    committedDate: DIRECT_DATE,
    message: DIRECT_MESSAGE,
    author: gitActor(OCTOCAT),
    authors: {
      __typename: 'GitActorConnection',
      nodes: [gitActor(OCTOCAT)],
    },
    associatedPullRequests: {
      __typename: 'PullRequestConnection',
      nodes: [],
    },
  },
]

// --- REST projection --------------------------------------------------------

const restComparison = {
  // GitHub sends a `url` key on this route, which is what stops Octokit's
  // pagination plugin unwrapping the payload. Keep it, so the fixture exercises
  // the same branch the GitHub path takes.
  url: `https://api.github.com/repos/${NAME_WITH_OWNER}/compare/base...main`,
  commits: [
    {
      sha: MERGE_SHA,
      commit: {
        message: MERGE_MESSAGE,
        committer: { date: MERGE_DATE },
        author: { name: OCTOCAT.name, date: MERGE_DATE },
      },
      author: { login: OCTOCAT.login },
    },
    {
      sha: DIRECT_SHA,
      commit: {
        message: DIRECT_MESSAGE,
        committer: { date: DIRECT_DATE },
        author: { name: OCTOCAT.name, date: DIRECT_DATE },
      },
      author: { login: OCTOCAT.login },
    },
  ],
}

const restPullRequest = {
  number: PULL_REQUEST.number,
  title: PULL_REQUEST.title,
  body: PULL_REQUEST.body,
  html_url: PULL_REQUEST.url,
  merged_at: PULL_REQUEST.mergedAt,
  updated_at: PULL_REQUEST.mergedAt,
  merge_commit_sha: MERGE_SHA,
  user: {
    login: OCTOCAT.login,
    html_url: `https://github.com/${OCTOCAT.login}`,
  },
  labels: [{ name: PULL_REQUEST.label }],
  base: { ref: PULL_REQUEST.baseRefName, repo: { full_name: NAME_WITH_OWNER } },
  head: { ref: PULL_REQUEST.headRefName, repo: { full_name: NAME_WITH_OWNER } },
}

/** The pull request's own pre-squash commits, each with a resolved account. */
const restPullRequestCommits = [
  {
    sha: 'c3c3c3c3',
    commit: { author: { name: OCTOCAT.name } },
    author: { login: OCTOCAT.login },
  },
  {
    sha: 'd4d4d4d4',
    commit: { author: { name: CONTRIBUTOR.name } },
    author: { login: CONTRIBUTOR.login },
  },
  {
    // A second commit by someone already credited must not duplicate them.
    sha: 'e5e5e5e5',
    commit: { author: { name: CONTRIBUTOR.name } },
    author: { login: CONTRIBUTOR.login },
  },
]

// --- harnesses --------------------------------------------------------------

const localMocks = vi.hoisted(() => ({
  graphqlIterator: vi.fn(),
}))

const graphqlGithub = () => {
  const { octokit } = testGitHubContext()
  const graphql = Object.assign(vi.fn(), {
    paginate: Object.assign(vi.fn(), { iterator: localMocks.graphqlIterator }),
  })

  localMocks.graphqlIterator.mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield {
        repository: {
          ref: {
            compare: {
              commits: {
                nodes: graphqlCommits,
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        },
      }
    },
  })

  return testGitHubContext({
    octokit: { ...octokit, graphql } as never,
  })
}

/**
 * Routes each paginated call by the endpoint it was handed, so the fixture stays
 * declarative rather than depending on call order.
 */
const restGithub = () => {
  const { octokit } = testGitHubContext()
  const { rest } = octokit

  const paginate = Object.assign(
    vi.fn(
      async (
        route: unknown,
        _options: Record<string, unknown>,
        mapPage?: (response: { data: unknown }) => unknown,
      ) => {
        if (route === rest.repos.compareCommitsWithBasehead) {
          return mapPage?.({ data: restComparison })
        }
        if (route === rest.pulls.listCommits) {
          return restPullRequestCommits
        }
        throw new Error('unexpected paginated route')
      },
    ),
    {
      iterator: vi.fn((route: unknown) => {
        if (route !== rest.pulls.list) {
          throw new Error('unexpected iterated route')
        }
        return {
          async *[Symbol.asyncIterator]() {
            yield { data: [restPullRequest] }
          },
        }
      }),
    },
  )

  return testGitHubContext({
    octokit: {
      ...octokit,
      paginate: paginate as unknown as Octokit['paginate'],
    } as never,
  })
}

const sharedParams = {
  owner: OWNER,
  name: REPO,
  baseCommitish: 'base',
  headCommitish: 'main',
  withPullRequestBody: true,
  withPullRequestURL: true,
  withBaseRefName: true,
  withHeadRefName: true,
}

const runGraphqlPath = () =>
  findCommitsInComparison({
    ...sharedParams,
    pullRequestLimit: 5,
    historyLimit: 15,
    useCommitishes: false,
    github: graphqlGithub(),
  })

const runRestPath = () =>
  findCommitsInComparisonRest({
    ...sharedParams,
    withCommitAuthors: true,
    github: restGithub(),
  })

/**
 * `id` is the one field that cannot agree: GraphQL returns an opaque relay node
 * id, and REST has no equivalent, so the REST path reuses the sha. Nothing
 * downstream reads it. Normalizing it keeps the rest of the comparison exact
 * instead of loosening the whole assertion.
 */
const withoutOpaqueIds = (commits: Array<{ id: string }>) =>
  commits.map((commit) => ({ ...commit, id: '<node-id>' }))

/**
 * Field names declared at the top level of a generated fragment.
 *
 * Reading these out of the generated document rather than restating them is what
 * makes the coverage test a real guard: editing the `.gql` fragment regenerates
 * this string, so a newly requested field shows up here and fails until the REST
 * builder supplies it too.
 */
const fragmentFields = (document: string, fragmentName: string) => {
  // Arguments and directives carry identifiers that are not fields.
  const source = document
    .replace(/\([^()]*\)/g, '')
    .replace(/@[A-Za-z_][A-Za-z0-9_]*/g, '')
  const start = source.indexOf(`fragment ${fragmentName} on`)
  if (start === -1) throw new Error(`fragment ${fragmentName} not found`)

  const fields: string[] = []
  let depth = 0

  for (let index = source.indexOf('{', start); index < source.length; index++) {
    const character = source[index]
    if (character === '{') {
      depth++
      continue
    }
    if (character === '}') {
      depth--
      if (depth === 0) break
      continue
    }
    if (depth !== 1) continue

    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index))?.[0]
    if (identifier) {
      fields.push(identifier)
      index += identifier.length - 1
    }
  }

  return fields
}

describe('comparison path parity', () => {
  beforeEach(() => {
    localMocks.graphqlIterator.mockReset()
  })

  it('produces the same commits from either API', async () => {
    const [viaGraphql, viaRest] = await Promise.all([
      runGraphqlPath(),
      runRestPath(),
    ])

    expect(withoutOpaqueIds(viaRest)).toEqual(withoutOpaqueIds(viaGraphql))
  })

  it('credits a squashed pull request with every author on both paths', async () => {
    const [viaGraphql, viaRest] = await Promise.all([
      runGraphqlPath(),
      runRestPath(),
    ])
    const logins = (commits: Awaited<ReturnType<typeof runRestPath>>) =>
      commits
        .find((commit) => commit.oid === MERGE_SHA)
        ?.authors?.nodes?.map((author) => author?.user?.login)

    // The trailer author is credited without being duplicated by their extra commit.
    expect(logins(viaRest)).toEqual([OCTOCAT.login, CONTRIBUTOR.login])
    expect(logins(viaRest)).toEqual(logins(viaGraphql))
  })

  it('supplies every commit field the GraphQL fragment requests', async () => {
    const commits = await runRestPath()

    for (const field of fragmentFields(
      FindCommitsInComparisonDocument.toString(),
      'ComparisonCommitFields',
    )) {
      expect(commits[0], `commit is missing "${field}"`).toHaveProperty(field)
    }
  })

  it('supplies every pull request field the GraphQL fragment requests', async () => {
    const commits = await runRestPath()
    const pullRequest = commits.find((commit) => commit.oid === MERGE_SHA)
      ?.associatedPullRequests?.nodes?.[0]

    // Every `@include`-gated field is switched on via sharedParams, so the whole
    // fragment must be covered.
    for (const field of fragmentFields(
      FindCommitsInComparisonDocument.toString(),
      'PullRequestFields',
    )) {
      expect(pullRequest, `pull request is missing "${field}"`).toHaveProperty(
        field,
      )
    }
  })
})
