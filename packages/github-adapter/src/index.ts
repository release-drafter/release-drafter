import process from 'node:process'
import { Octokit as OctokitCore } from '@octokit/core'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { retry } from '@octokit/plugin-retry'
import type {
  ChangeSet,
  Commit,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeAdapter,
  Logger,
  PullRequest,
  Release,
  Repository,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
} from '@release-drafter/core'
// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import { noopLogger } from '@release-drafter/core'
import { EnvHttpProxyAgent, fetch as undiciFetch } from 'undici'
import {
  FindPullRequestChangedFilesDocument,
  FindRecentMergedPullRequestsDocument,
  HydrateComparisonCommitsDocument,
  ResolveCommitishDocument,
  ResolvePullRequestCommitishDocument,
} from './types/github.graphql.generated.ts'

const GitHubOctokit = OctokitCore.plugin(
  restEndpointMethods,
  paginateRest,
  paginateGraphQL,
  retry,
)

export type GitHubOctokit = InstanceType<typeof GitHubOctokit>
export type GitHubFetch = typeof globalThis.fetch

export type GitHubAdapterOptions = {
  token: string
  serverUrl?: string
  apiUrl?: string
  graphqlUrl?: string
  logger?: Logger
  octokit?: GitHubOctokit
  fetch?: GitHubFetch
  env?: NodeJS.ProcessEnv
  requestAgent?: object
  requestRetries?: number
  changedFilesConcurrency?: number
  contributorConcurrency?: number
}

export type RepositoryConfigRequest = {
  repository: Repository
  path: string
  ref?: string
}

const RELEASE_COUNT_LIMIT = 1000
const RECENT_PR_LOOKBACK = 5
const DEFAULT_CONCURRENCY = 5

const deriveEndpoints = (
  options: Pick<GitHubAdapterOptions, 'serverUrl' | 'apiUrl' | 'graphqlUrl'>,
) => {
  const serverUrl = (options.serverUrl ?? 'https://github.com').replace(
    /\/$/,
    '',
  )
  const githubDotCom = serverUrl === 'https://github.com'
  const apiUrl = (
    options.apiUrl ??
    (githubDotCom ? 'https://api.github.com' : `${serverUrl}/api/v3`)
  ).replace(/\/$/, '')
  const graphqlUrl = (
    options.graphqlUrl ??
    (githubDotCom
      ? 'https://api.github.com/graphql'
      : `${serverUrl}/api/graphql`)
  ).replace(/\/$/, '')
  return { serverUrl, apiUrl, graphqlUrl }
}

const createProxyAwareFetch = (env: NodeJS.ProcessEnv): GitHubFetch => {
  const dispatcher = new EnvHttpProxyAgent({
    httpProxy: env.HTTP_PROXY ?? env.http_proxy,
    httpsProxy: env.HTTPS_PROXY ?? env.https_proxy,
    noProxy: env.NO_PROXY ?? env.no_proxy,
  })
  const fetchWithDispatcher = undiciFetch as unknown as (
    input: unknown,
    init: unknown,
  ) => ReturnType<GitHubFetch>
  return ((
    input: Parameters<GitHubFetch>[0],
    init?: Parameters<GitHubFetch>[1],
  ) => fetchWithDispatcher(input, { ...init, dispatcher })) as GitHubFetch
}

const normalizeRelease = (release: {
  id: string | number
  tag_name: string
  name?: string | null
  target_commitish?: string
  created_at?: string
  draft?: boolean
  prerelease?: boolean
  html_url?: string
  upload_url?: string
}): Release => ({
  id: release.id,
  tagName: release.tag_name,
  name: release.name,
  targetCommitish: release.target_commitish,
  createdAt: release.created_at,
  draft: release.draft,
  prerelease: release.prerelease,
  url: release.html_url,
  uploadUrl: release.upload_url,
})

type GraphPullRequest = {
  number: number
  title: string
  body?: string | null
  url?: string
  mergedAt?: string | null
  baseRefName?: string
  headRefName?: string
  baseRepository?: { nameWithOwner?: string | null } | null
  isCrossRepository?: boolean
  author?: { __typename?: string; login: string; url?: string } | null
  labels?: { nodes?: Array<{ name?: string | null } | null> | null } | null
  merged?: boolean
  mergeCommit?: { oid?: string | null } | null
}

type GraphCommit = {
  id?: string
  oid: string
  committedDate?: string
  message?: string
  author?: {
    name?: string | null
    user?: { login?: string | null } | null
  } | null
  authors?: {
    nodes?: Array<{
      name?: string | null
      user?: { login?: string | null } | null
    } | null> | null
  } | null
  associatedPullRequests?: {
    nodes?: Array<GraphPullRequest | null> | null
  } | null
}

const normalizePullRequest = (pullRequest: GraphPullRequest): PullRequest => ({
  number: pullRequest.number,
  title: pullRequest.title,
  body: pullRequest.body,
  url: pullRequest.url,
  mergedAt: pullRequest.mergedAt,
  baseRefName: pullRequest.baseRefName,
  headRefName: pullRequest.headRefName,
  baseRepository: pullRequest.baseRepository?.nameWithOwner ?? null,
  isCrossRepository: pullRequest.isCrossRepository,
  author: pullRequest.author
    ? {
        login: pullRequest.author.login,
        url: pullRequest.author.url,
        type: pullRequest.author.__typename,
      }
    : pullRequest.author,
  labels: (pullRequest.labels?.nodes ?? []).flatMap((label) =>
    label?.name ? [label.name] : [],
  ),
  mergeCommitOid: pullRequest.mergeCommit?.oid,
})

const normalizeCommit = (commit: GraphCommit): Commit => ({
  id: commit.id,
  oid: commit.oid,
  committedAt: commit.committedDate,
  message: commit.message,
  author: commit.author
    ? {
        name: commit.author.name,
        login: commit.author.user?.login,
        type: 'User',
      }
    : commit.author,
  authors: commit.authors
    ? (commit.authors.nodes ?? []).map((author) =>
        author
          ? { name: author.name, login: author.user?.login, type: 'User' }
          : author,
      )
    : commit.authors,
  associatedPullRequests: commit.associatedPullRequests
    ? (commit.associatedPullRequests.nodes ?? []).map((pullRequest) =>
        pullRequest
          ? {
              number: pullRequest.number,
              baseRepository: pullRequest.baseRepository?.nameWithOwner ?? null,
            }
          : pullRequest,
      )
    : commit.associatedPullRequests,
})

const mapConcurrent = async <T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await task(items[index])
      }
    },
  )
  await Promise.all(workers)
  return results
}

export class GitHubAdapter implements ForgeAdapter {
  readonly capabilities = { draftReleases: true } as const
  readonly serverUrl: string
  readonly apiUrl: string
  readonly graphqlUrl: string
  readonly octokit: GitHubOctokit
  private readonly graphql: GitHubOctokit['graphql']
  private readonly logger: Logger
  private readonly changedFilesConcurrency: number
  private readonly contributorConcurrency: number

  constructor(options: GitHubAdapterOptions) {
    if (!options.token?.trim())
      throw new Error('GitHub authentication token is required')
    const endpoints = deriveEndpoints(options)
    this.serverUrl = endpoints.serverUrl
    this.apiUrl = endpoints.apiUrl
    this.graphqlUrl = endpoints.graphqlUrl
    this.logger = options.logger ?? noopLogger
    this.changedFilesConcurrency =
      options.changedFilesConcurrency ?? DEFAULT_CONCURRENCY
    this.contributorConcurrency =
      options.contributorConcurrency ?? DEFAULT_CONCURRENCY
    if (options.octokit) {
      this.octokit = options.octokit
    } else {
      const requestFetch =
        options.fetch ?? createProxyAwareFetch(options.env ?? process.env)
      this.octokit = new GitHubOctokit({
        auth: options.token,
        baseUrl: this.apiUrl,
        log: { ...this.logger, warn: this.logger.warning.bind(this.logger) },
        request: {
          fetch: requestFetch,
          ...(options.requestAgent ? { agent: options.requestAgent } : {}),
          ...(options.requestRetries === undefined
            ? {}
            : { retries: options.requestRetries }),
        },
        graphql: { baseUrl: this.graphqlUrl },
      })
    }
    const graphqlEndpoint = new URL(this.graphqlUrl)
    this.graphql = this.octokit.graphql.defaults
      ? (this.octokit.graphql.defaults({
          baseUrl: graphqlEndpoint.origin,
          url: `${graphqlEndpoint.pathname}${graphqlEndpoint.search}`,
        }) as GitHubOctokit['graphql'])
      : this.octokit.graphql
  }

  async listReleases({
    repository,
  }: {
    repository: Repository
  }): Promise<Release[]> {
    // GraphQL Release omits target_commitish and upload_url, both required by
    // the normalized core contract and legacy release filtering/output parity.
    let releaseCount = 0
    const releases = await this.octokit.paginate(
      this.octokit.rest.repos.listReleases,
      { owner: repository.owner, repo: repository.name, per_page: 100 },
      (response, done) => {
        const remaining = RELEASE_COUNT_LIMIT - releaseCount
        const page = response.data.slice(0, remaining)
        releaseCount += page.length
        if (releaseCount >= RELEASE_COUNT_LIMIT) done()
        return page
      },
    )
    return releases.map(normalizeRelease)
  }

  async findChanges(params: FindChangesRequest): Promise<ChangeSet> {
    const { repository, comparison } = params
    const comparisonOids: string[] = []
    // Ref.compare cannot resolve every arbitrary SHA/tag/non-linear range.
    // REST compare is the correctness oracle; GraphQL hydrates its exact OIDs.
    for await (const response of this.octokit.paginate.iterator(
      this.octokit.rest.repos.compareCommitsWithBasehead,
      {
        owner: repository.owner,
        repo: repository.name,
        basehead: `${comparison.baseRef}...${comparison.headRef}`,
        per_page: 100,
      },
    )) {
      const data = response.data as unknown as {
        commits: Array<{ sha: string }>
      }
      comparisonOids.push(...data.commits.map((commit) => commit.sha))
    }
    if (comparisonOids.length === 0) {
      return { commits: [], pullRequests: [], newContributorLogins: new Set() }
    }

    const graphCommits = await this.hydrateComparisonCommits(
      params,
      comparisonOids,
    )
    const commitsByOid = new Map(
      graphCommits.map((commit) => [commit.oid, commit]),
    )
    const missingOids = comparisonOids.filter((oid) => !commitsByOid.has(oid))
    if (missingOids.length > 0) {
      throw new Error(
        `GitHub GraphQL could not hydrate ${missingOids.length} comparison commit(s): ${missingOids.join(', ')}`,
      )
    }
    const orderedGraphCommits = comparisonOids.map(
      (oid) => commitsByOid.get(oid) as GraphCommit,
    )
    const repositoryName = `${repository.owner}/${repository.name}`
    const pullRequestsByKey = new Map<string, GraphPullRequest>()
    for (const commit of orderedGraphCommits) {
      for (const pullRequest of commit.associatedPullRequests?.nodes ?? []) {
        if (!pullRequest) continue
        const key = `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`
        if (!pullRequestsByKey.has(key)) pullRequestsByKey.set(key, pullRequest)
      }
    }

    const isBranchRef = comparison.headRef.startsWith('refs/heads/')
    const isUnsupportedRecentRef =
      comparison.headRef.startsWith('refs/tags/') ||
      comparison.headRef.startsWith('refs/pull/')
    if (!isUnsupportedRecentRef) {
      const recovered = await this.findRecentPullRequests(
        params,
        new Set(comparisonOids),
        new Set(pullRequestsByKey.keys()),
        isBranchRef ? comparison.headRef.replace(/^refs\/heads\//, '') : null,
      )
      for (const pullRequest of recovered) {
        const key = `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`
        if (!pullRequestsByKey.has(key)) pullRequestsByKey.set(key, pullRequest)
      }
    }

    const graphPullRequests = [...pullRequestsByKey.values()].filter(
      (pullRequest) =>
        pullRequest.baseRepository?.nameWithOwner === repositoryName &&
        pullRequest.merged,
    )
    const changedFiles = params.includeChangedFiles
      ? await this.loadChangedFiles(repository, graphPullRequests)
      : new Map<string, string[]>()
    const pullRequests = graphPullRequests.map((pullRequest) => ({
      ...normalizePullRequest(pullRequest),
      ...(params.includeChangedFiles
        ? {
            changedFiles:
              changedFiles.get(`${repositoryName}#${pullRequest.number}`) ?? [],
          }
        : {}),
    }))
    const newContributorLogins = params.includeNewContributors
      ? await this.findNewContributorLogins(repository, graphPullRequests)
      : new Set<string>()

    return {
      commits: orderedGraphCommits.map(normalizeCommit),
      pullRequests,
      newContributorLogins,
    }
  }

  private async hydrateComparisonCommits(
    params: FindChangesRequest,
    comparisonOids: string[],
  ): Promise<GraphCommit[]> {
    const needed = new Set(comparisonOids)
    const found = new Map<string, GraphCommit>()
    let cursor: string | null = null
    let shouldContinue = true
    while (shouldContinue) {
      const data: {
        repository?: {
          object?: {
            __typename?: string
            history?: {
              pageInfo: { hasNextPage: boolean; endCursor?: string | null }
              nodes?: Array<GraphCommit | null> | null
            } | null
          } | null
        } | null
      } = await this.graphql(HydrateComparisonCommitsDocument.toString(), {
        name: params.repository.name,
        owner: params.repository.owner,
        headRef: `${params.comparison.headRef}^{commit}`,
        cursor,
        historyLimit: Math.min(Math.max(1, params.historyLimit), 100),
        pullRequestLimit: Math.min(Math.max(1, params.pullRequestLimit), 100),
        withPullRequestBody: params.pullRequestFields.body,
        withPullRequestURL: params.pullRequestFields.url,
        withBaseRefName: params.pullRequestFields.baseRefName,
        withHeadRefName: params.pullRequestFields.headRefName,
      })
      const object = data.repository?.object
      if (object?.__typename !== 'Commit' || !object.history) {
        throw new Error(
          `GitHub GraphQL head ref ${params.comparison.headRef} did not resolve to a commit`,
        )
      }
      for (const commit of object.history.nodes ?? []) {
        if (commit && needed.has(commit.oid)) found.set(commit.oid, commit)
      }
      if (found.size === needed.size || !object.history.pageInfo.hasNextPage) {
        shouldContinue = false
        continue
      }
      cursor = object.history.pageInfo.endCursor ?? null
      if (!cursor) shouldContinue = false
    }
    return [...found.values()]
  }

  private async findRecentPullRequests(
    params: FindChangesRequest,
    commitOids: Set<string>,
    foundKeys: Set<string>,
    baseRefName: string | null,
  ): Promise<GraphPullRequest[]> {
    const data: {
      repository?: {
        pullRequests?: { nodes?: Array<GraphPullRequest | null> | null } | null
      } | null
    } = await this.graphql(FindRecentMergedPullRequestsDocument.toString(), {
      name: params.repository.name,
      owner: params.repository.owner,
      baseRefName,
      limit: RECENT_PR_LOOKBACK,
      withPullRequestBody: params.pullRequestFields.body,
      withPullRequestURL: params.pullRequestFields.url,
      withBaseRefName: params.pullRequestFields.baseRefName,
      withHeadRefName: params.pullRequestFields.headRefName,
    })
    return (data.repository?.pullRequests?.nodes ?? []).flatMap(
      (pullRequest) => {
        if (!pullRequest?.mergeCommit?.oid) return []
        const key = `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`
        return commitOids.has(pullRequest.mergeCommit.oid) &&
          !foundKeys.has(key)
          ? [pullRequest]
          : []
      },
    )
  }

  private async loadChangedFiles(
    repository: Repository,
    pullRequests: GraphPullRequest[],
  ): Promise<Map<string, string[]>> {
    const entries = await mapConcurrent(
      pullRequests,
      this.changedFilesConcurrency,
      async (pullRequest) => {
        try {
          const paths = await this.findPullRequestChangedFiles({
            repository,
            number: pullRequest.number,
          })
          return [
            `${repository.owner}/${repository.name}#${pullRequest.number}`,
            paths,
          ] as const
        } catch (error) {
          throw new Error(
            `Failed to list changed files for pull request #${pullRequest.number}.`,
            { cause: error },
          )
        }
      },
    )
    return new Map(entries)
  }

  async findPullRequestChangedFiles(params: {
    repository: Repository
    number: number
  }): Promise<string[]> {
    const paths: string[] = []
    let cursor: string | null = null
    let shouldContinue = true
    while (shouldContinue) {
      const data: {
        repository?: {
          pullRequest?: {
            files?: {
              pageInfo: {
                hasNextPage: boolean
                endCursor?: string | null
              }
              nodes?: Array<{ path?: string | null } | null> | null
            } | null
          } | null
        } | null
      } = await this.graphql(FindPullRequestChangedFilesDocument.toString(), {
        name: params.repository.name,
        owner: params.repository.owner,
        number: params.number,
        cursor,
      })
      const files = data.repository?.pullRequest?.files
      if (!files) {
        throw new Error('Query returned no pull request file connection')
      }
      paths.push(
        ...(files.nodes ?? []).flatMap((file) =>
          file?.path ? [file.path] : [],
        ),
      )
      if (files.pageInfo.hasNextPage && !files.pageInfo.endCursor) {
        throw new Error(
          'Query returned no end cursor for the next pull request file page',
        )
      }
      cursor = files.pageInfo.endCursor ?? null
      shouldContinue = files.pageInfo.hasNextPage && Boolean(cursor)
    }
    return paths
  }

  private async findNewContributorLogins(
    repository: Repository,
    pullRequests: GraphPullRequest[],
  ): Promise<Set<string>> {
    const firstMergedAtByLogin = new Map<string, string>()
    for (const pullRequest of pullRequests) {
      if (pullRequest.author?.__typename !== 'User' || !pullRequest.mergedAt)
        continue
      const previous = firstMergedAtByLogin.get(pullRequest.author.login)
      if (!previous || pullRequest.mergedAt < previous)
        firstMergedAtByLogin.set(pullRequest.author.login, pullRequest.mergedAt)
    }
    const candidates = [...firstMergedAtByLogin]
    const chunks = Array.from(
      { length: Math.ceil(candidates.length / 20) },
      (_, index) => candidates.slice(index * 20, index * 20 + 20),
    )
    const results = await mapConcurrent(
      chunks,
      this.contributorConcurrency,
      async (chunk) => {
        const variables = Object.fromEntries(
          chunk.map(([login, mergedAt], index) => [
            `query${index}`,
            `repo:${repository.owner}/${repository.name} is:pr is:merged author:${login} merged:<${mergedAt}`,
          ]),
        )
        const data = await this.graphql<
          Record<string, { issueCount?: number }>
        >(
          `query findPreviousContributions(${chunk.map((_, index) => `$query${index}: String!`).join(', ')}) {
          ${chunk.map((_, index) => `author${index}: search(query: $query${index}, type: ISSUE, first: 1) { issueCount }`).join('\n')}
        }`,
          variables,
        )
        return chunk.flatMap(([login], index) =>
          data[`author${index}`]?.issueCount === 0 ? [login] : [],
        )
      },
    )
    return new Set(results.flat())
  }

  async resolveCommitish({
    repository,
    commitish,
  }: ResolveCommitishRequest): Promise<string> {
    if (commitish.startsWith('refs/heads/'))
      return commitish.replace(/^refs\/heads\//, '')
    if (commitish.startsWith('refs/tags/')) {
      try {
        return await this.resolveObject(repository, `${commitish}^{commit}`)
      } catch {
        this.logger.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )
        return ''
      }
    }
    if (commitish.startsWith('refs/pull/')) {
      const match = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish)
      if (!match) {
        this.logger.warning(
          `${commitish} is not a supported pull request ref, falling back to default branch`,
        )
        return ''
      }
      try {
        const data: {
          repository?: {
            pullRequest?: {
              headRefOid?: string | null
              mergeCommit?: { oid?: string | null } | null
              potentialMergeCommit?: { oid?: string | null } | null
            } | null
          } | null
        } = await this.graphql(ResolvePullRequestCommitishDocument.toString(), {
          name: repository.name,
          owner: repository.owner,
          number: Number(match[1]),
        })
        const pullRequest = data.repository?.pullRequest
        const oid =
          match[2] === 'head'
            ? pullRequest?.headRefOid
            : (pullRequest?.potentialMergeCommit?.oid ??
              pullRequest?.mergeCommit?.oid)
        if (!oid)
          throw new Error(
            `Pull request #${match[1]} does not have a ${match[2]} commit`,
          )
        return oid
      } catch {
        this.logger.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )
        return ''
      }
    }
    return commitish
  }

  private async resolveObject(
    repository: Repository,
    expression: string,
  ): Promise<string> {
    const data: {
      repository?: {
        object?: { __typename?: string; oid?: string } | null
      } | null
    } = await this.graphql(ResolveCommitishDocument.toString(), {
      name: repository.name,
      owner: repository.owner,
      expression,
    })
    if (
      data.repository?.object?.__typename !== 'Commit' ||
      !data.repository.object.oid
    ) {
      throw new Error(`${expression} does not point to a commit`)
    }
    return data.repository.object.oid
  }

  async createRelease({
    repository,
    payload,
  }: CreateReleaseRequest): Promise<Release> {
    // GitHub's GraphQL Mutation type has no release create/update mutations.
    const request = {
      owner: repository.owner,
      repo: repository.name,
      body: payload.body,
      draft: payload.draft,
      prerelease: payload.prerelease,
      make_latest: payload.prerelease
        ? 'false'
        : payload.makeLatest
          ? 'true'
          : 'false',
      name: payload.name,
      tag_name: payload.tag,
      target_commitish: payload.targetCommitish,
    } as Parameters<GitHubOctokit['rest']['repos']['createRelease']>[0]
    const response = await this.octokit.rest.repos.createRelease(request)
    return normalizeRelease(response.data)
  }

  async updateRelease({
    repository,
    release,
    payload,
  }: UpdateReleaseRequest): Promise<Release> {
    const response = await this.octokit.rest.repos.updateRelease({
      owner: repository.owner,
      repo: repository.name,
      release_id: Number(release.id),
      body: payload.body,
      draft: payload.draft,
      prerelease: payload.prerelease,
      make_latest: payload.prerelease
        ? 'false'
        : payload.makeLatest
          ? 'true'
          : 'false',
      ...(payload.name || release.name
        ? { name: payload.name || release.name || undefined }
        : {}),
      ...(payload.tag || release.tagName
        ? { tag_name: payload.tag || release.tagName }
        : {}),
      ...(payload.targetCommitish
        ? { target_commitish: payload.targetCommitish }
        : {}),
    })
    return normalizeRelease(response.data)
  }

  async getRepositoryConfig({
    repository,
    path,
    ref,
  }: RepositoryConfigRequest): Promise<string> {
    // Blob.text can be null or truncated and cannot preserve raw media bytes;
    // REST raw mode also provides the required 404/content-type diagnostics,
    // with the documented GHES base64 content-object fallback below.
    const target = `${repository.owner}/${repository.name}:${path}${ref ? `@${ref}` : ''}`
    const canonicalRef = ref?.replace(/^refs\/heads\//, '')
    let response: Awaited<
      ReturnType<GitHubOctokit['rest']['repos']['getContent']>
    >
    try {
      response = await this.octokit.rest.repos.getContent({
        owner: repository.owner,
        repo: repository.name,
        path,
        ...(canonicalRef ? { ref: canonicalRef } : {}),
        mediaType: { format: 'raw' },
      })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        throw new Error(
          `Config file not found with error 404. (target: ${target})`,
        )
      }
      throw new Error(
        `Failed to fetch config from repo: ${(error as Error).message}`,
      )
    }
    if (response.data == null)
      throw new Error(
        `Fetched content is null, expected a file. (target: ${target})`,
      )
    if (Array.isArray(response.data))
      throw new Error(
        `Fetched content is a directory (array), expected a file. (target: ${target})`,
      )
    const contentType = response.headers?.['content-type']
    const isContentObject =
      typeof response.data === 'object' &&
      response.data !== null &&
      !Array.isArray(response.data) &&
      'content' in response.data
    if (
      contentType &&
      !contentType.startsWith('application/vnd.github.v3.raw') &&
      !contentType.startsWith('text/plain') &&
      !isContentObject
    ) {
      throw new Error(
        `Fetched content has wrong content-type (${contentType}), expected a raw file. (target: ${target})`,
      )
    }
    if (typeof response.data === 'string') {
      if (
        contentType &&
        !contentType.startsWith('application/vnd.github.v3.raw') &&
        !contentType.startsWith('text/plain')
      ) {
        throw new Error(
          `Fetched content has wrong content-type (${contentType}), expected a raw file. (target: ${target})`,
        )
      }
      return response.data
    }
    if ('type' in response.data && response.data.type !== 'file') {
      throw new Error(
        `Fetched content has wrong type (${response.data.type}), expected a file. (target: ${target})`,
      )
    }
    if (
      'content' in response.data &&
      typeof response.data.content === 'string'
    ) {
      return Buffer.from(
        response.data.content,
        response.data.encoding === 'base64' ? 'base64' : 'utf8',
      ).toString('utf8')
    }
    throw new Error(`Fetched content is not a string. (target: ${target})`)
  }
}

export const createGitHubAdapter = (
  options: GitHubAdapterOptions,
): GitHubAdapter => new GitHubAdapter(options)

export const GITHUB_ADAPTER_PACKAGE_NAME =
  '@release-drafter/github-adapter' as const
