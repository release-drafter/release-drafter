import process from 'node:process'
import type {
  ChangeSet,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeAdapter,
  Logger,
  PullRequestReader,
  PullRequestValidationData,
  Release,
  Repository,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
} from '@release-drafter/core'
import { noopLogger } from '@release-drafter/core'
import {
  FindPullRequestChangedFilesDocument,
  FindRecentMergedPullRequestsDocument,
  HydrateComparisonCommitsDocument,
  PollCommitAssociationsDocument,
  ResolveCommitishDocument,
  ResolvePullRequestCommitishDocument,
} from './types/github.graphql.generated.ts'
import type {
  GitHubAdapterOptions,
  GraphCommit,
  GraphPullRequest,
  RepositoryConfigRequest,
} from './types/github.ts'
import { mapConcurrent } from './utils/map-concurrent.ts'
import {
  normalizeCommit,
  normalizePullRequest,
  normalizeRelease,
} from './utils/normalize.ts'
import {
  createProxyAwareFetch,
  deriveEndpoints,
  type GitHubOctokit,
  GitHubOctokitClient,
} from './utils/octokit.ts'
import { sleep } from './utils/sleep.ts'

export type {
  GitHubAdapterOptions,
  GitHubFetch,
  RepositoryConfigRequest,
} from './types/github.ts'
export type { GitHubOctokit } from './utils/octokit.ts'

const RELEASE_COUNT_LIMIT = 1000
const RECENT_PULL_REQUEST_LOOKBACK = 5
const DEFAULT_CONCURRENCY = 5

const ASSOCIATION_INITIAL_QUIET_PERIOD_MS = 15_000
const ASSOCIATION_POLL_INTERVAL_MS = 5_000
const ASSOCIATION_POLL_TIMEOUT_MS = 60_000
const ASSOCIATION_SETTLING_DELAY_MS = 2_500
const ASSOCIATION_POLL_BATCH_SIZE = 50
// With an initial request at 15 seconds, nine attempts cover 15..55 seconds;
// the 60-second deadline also bounds the final request duration.
const ASSOCIATION_POLL_ATTEMPTS = Math.ceil(
  (ASSOCIATION_POLL_TIMEOUT_MS - ASSOCIATION_INITIAL_QUIET_PERIOD_MS) /
    ASSOCIATION_POLL_INTERVAL_MS,
)

const hasPullRequestAssociation = (commit: GraphCommit) =>
  (commit.associatedPullRequests?.totalCount ?? 0) > 0 ||
  (commit.associatedPullRequests?.nodes?.length ?? 0) > 0

const pullRequestKey = (pullRequest: GraphPullRequest) =>
  `${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`

type AssociationRefreshResult = {
  newlyAssociatedCount: number
  missingNodeIds: string[]
}

type ContradictoryCommitAssociation = {
  commit: GraphCommit
  expectedPullRequestKey: string
}

const pullRequestKeysForCommit = (commit: GraphCommit) =>
  new Set(
    (commit.associatedPullRequests?.nodes ?? []).flatMap((pullRequest) =>
      pullRequest ? [pullRequestKey(pullRequest)] : [],
    ),
  )

const hasExpectedPullRequestAssociation = ({
  commit,
  expectedPullRequestKey,
}: ContradictoryCommitAssociation) =>
  pullRequestKeysForCommit(commit).has(expectedPullRequestKey)

export class GitHubAdapter implements ForgeAdapter, PullRequestReader {
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
      this.octokit = new GitHubOctokitClient({
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
    // GraphQL Release omits target_commitish for filtering and upload_url for
    // the Action output contract.
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

  async getDefaultBranch(repository: Repository): Promise<string> {
    const response = await this.octokit.rest.repos.get({
      owner: repository.owner,
      repo: repository.name,
    })
    const branch = response.data.default_branch?.trim()
    if (!branch) throw new Error('GitHub returned a blank default branch')
    return branch
  }

  async findChanges(params: FindChangesRequest): Promise<ChangeSet> {
    const { repository, comparison } = params
    const comparisonOids: string[] = []
    // GraphQL Ref.compare cannot resolve all comparisons that use arbitrary
    // SHAs, tags, or non-linear histories. REST returns the comparison commit
    // OIDs, and GraphQL loads the data for those OIDs.
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
        `GitHub GraphQL did not return data for ${missingOids.length} comparison commits: ${missingOids.join(', ')}`,
      )
    }
    const orderedGraphCommits = comparisonOids.map(
      (oid) => commitsByOid.get(oid) as GraphCommit,
    )
    const repositoryName = `${repository.owner}/${repository.name}`
    const isBranchRef = comparison.headRef.startsWith('refs/heads/')
    const isPullRequestRef = comparison.headRef.startsWith('refs/pull/')
    let emptyAssociationsCanBeClassifiedAsUnassociated = false
    let matchingRecentPullRequests: GraphPullRequest[] = []

    if (isPullRequestRef) {
      this.logger.debug(
        `Skipping recent pull request recovery for ephemeral ref ${comparison.headRef}.`,
      )
    } else {
      const baseRefName = isBranchRef
        ? comparison.headRef.replace(/^refs\/heads\//, '')
        : null
      this.logger.debug(
        `Checking the ${RECENT_PULL_REQUEST_LOOKBACK} most recently updated merged pull requests${baseRefName ? ` targeting ${baseRefName}` : ''} for delayed commit associations.`,
      )
      const recentCheck = await this.checkRecentPullRequestAssociations(
        params,
        new Set(comparisonOids),
        commitsByOid,
        baseRefName,
      )
      matchingRecentPullRequests = recentCheck.matchingPullRequests
      this.logger.debug(
        `Recent pull request check matched ${matchingRecentPullRequests.length} pull request${matchingRecentPullRequests.length === 1 ? '' : 's'} in the comparison and found ${recentCheck.contradictoryAssociations.length} contradictory merge commit association${recentCheck.contradictoryAssociations.length === 1 ? '' : 's'}.`,
      )

      const commitsWithEmptyAssociations = orderedGraphCommits.filter(
        (commit) => !hasPullRequestAssociation(commit),
      )
      if (recentCheck.contradictoryAssociations.length === 0) {
        if (
          params.includeCommits &&
          matchingRecentPullRequests.length > 0 &&
          commitsWithEmptyAssociations.length > 0
        ) {
          const commitsById = new Map(
            orderedGraphCommits.flatMap((commit) =>
              commit.id ? ([[commit.id, commit]] as const) : [],
            ),
          )
          emptyAssociationsCanBeClassifiedAsUnassociated =
            await this.performFinalAssociationRefresh({
              params,
              commits: commitsWithEmptyAssociations,
              commitsById,
              reason:
                'Recent merged pull requests and empty commit associations were returned together.',
            })
        } else {
          emptyAssociationsCanBeClassifiedAsUnassociated = true
          this.logger.debug(
            'The recent pull request check found no contradictory or unsettled commit associations; empty associations can be classified as unassociated.',
          )
        }
      } else if (!params.includeCommits) {
        this.logger.debug(
          'Skipping commit association polling because individual commits are disabled.',
        )
      } else {
        emptyAssociationsCanBeClassifiedAsUnassociated =
          await this.waitForCommitAssociations({
            params,
            commits: orderedGraphCommits,
            contradictoryAssociations: recentCheck.contradictoryAssociations,
          })
      }

      this.backfillRecentPullRequestAssociations(
        commitsByOid,
        matchingRecentPullRequests,
      )
    }

    const pullRequestsByKey = new Map<string, GraphPullRequest>()
    for (const commit of orderedGraphCommits) {
      for (const pullRequest of commit.associatedPullRequests?.nodes ?? []) {
        if (pullRequest) {
          pullRequestsByKey.set(pullRequestKey(pullRequest), pullRequest)
        }
      }
    }
    for (const pullRequest of matchingRecentPullRequests) {
      pullRequestsByKey.set(pullRequestKey(pullRequest), pullRequest)
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
    const commits = orderedGraphCommits.map(normalizeCommit)
    if (emptyAssociationsCanBeClassifiedAsUnassociated) {
      let directCommitCount = 0
      for (const commit of commits) {
        if (commit.associationStatus === 'unresolved') {
          commit.associationStatus = 'unassociated'
          directCommitCount += 1
        }
      }
      this.logger.debug(
        `Classified ${directCommitCount} commit${directCommitCount === 1 ? '' : 's'} with empty pull request associations as unassociated.`,
      )
    }
    const newCommitContributors =
      params.includeCommits && params.includeNewContributors
        ? await this.findNewCommitContributors(params, commits)
        : []

    return {
      commits,
      pullRequests,
      newContributorLogins,
      newCommitContributors,
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

  /**
   * Checks a small, fresh PR-table window for merge commits present in the
   * comparison. A matching PR whose merge commit reported no reverse association
   * is concrete evidence that GitHub's commit association data is delayed.
   */
  private async checkRecentPullRequestAssociations(
    params: FindChangesRequest,
    comparisonOids: Set<string>,
    commitsByOid: ReadonlyMap<string, GraphCommit>,
    baseRefName: string | null,
  ): Promise<{
    matchingPullRequests: GraphPullRequest[]
    contradictoryAssociations: ContradictoryCommitAssociation[]
  }> {
    const data: {
      repository?: {
        pullRequests?: {
          nodes?: Array<GraphPullRequest | null> | null
        } | null
      } | null
    } = await this.graphql(FindRecentMergedPullRequestsDocument.toString(), {
      name: params.repository.name,
      owner: params.repository.owner,
      baseRefName,
      limit: RECENT_PULL_REQUEST_LOOKBACK,
      withPullRequestBody: params.pullRequestFields.body,
      withPullRequestURL: params.pullRequestFields.url,
      withBaseRefName: params.pullRequestFields.baseRefName,
      withHeadRefName: params.pullRequestFields.headRefName,
    })
    const pullRequestConnection = data.repository?.pullRequests
    if (!pullRequestConnection) {
      throw new Error('Query returned no recent pull request connection')
    }

    const matchingPullRequests = (pullRequestConnection.nodes ?? []).flatMap(
      (pullRequest) => {
        const mergeCommitOid = pullRequest?.mergeCommit?.oid
        return pullRequest &&
          mergeCommitOid &&
          comparisonOids.has(mergeCommitOid)
          ? [pullRequest]
          : []
      },
    )
    const contradictoryAssociations = matchingPullRequests.flatMap(
      (pullRequest) => {
        const mergeCommitOid = pullRequest.mergeCommit?.oid
        const mergeCommit = mergeCommitOid
          ? commitsByOid.get(mergeCommitOid)
          : undefined
        if (!mergeCommit) return []
        const contradiction = {
          commit: mergeCommit,
          expectedPullRequestKey: pullRequestKey(pullRequest),
        }
        return hasExpectedPullRequestAssociation(contradiction)
          ? []
          : [contradiction]
      },
    )

    return {
      matchingPullRequests,
      contradictoryAssociations,
    }
  }

  private async performFinalAssociationRefresh(params: {
    params: FindChangesRequest
    commits: GraphCommit[]
    commitsById: ReadonlyMap<string, GraphCommit>
    reason: string
  }) {
    const { params: request, commits, commitsById, reason } = params
    const commitsWithNodeIds = commits.filter((commit) => commit.id).length
    if (commitsWithNodeIds !== commits.length) {
      const missingNodeIdCount = commits.length - commitsWithNodeIds
      this.logger.warning(
        `GitHub omitted node IDs for ${missingNodeIdCount} unresolved comparison commit${missingNodeIdCount === 1 ? '' : 's'}. Release Drafter cannot perform the final association refresh, so those commits will be omitted.`,
      )
      return false
    }

    this.logger.info(
      `${reason} Waiting ${ASSOCIATION_SETTLING_DELAY_MS / 1000} seconds before one final refresh of ${commits.length} possible sibling or direct commit${commits.length === 1 ? '' : 's'}.`,
    )
    await sleep(ASSOCIATION_SETTLING_DELAY_MS)
    const finalRefreshSignal = AbortSignal.timeout(ASSOCIATION_POLL_INTERVAL_MS)
    let finalRefresh: AssociationRefreshResult
    try {
      finalRefresh = await this.refreshCommitAssociations(
        request,
        commits,
        commitsById,
        finalRefreshSignal,
      )
    } catch (error) {
      if (finalRefreshSignal.aborted) {
        this.logger.warning(
          `GitHub's final association refresh exceeded ${ASSOCIATION_POLL_INTERVAL_MS / 1000} seconds. Release Drafter cannot safely classify the remaining empty associations.`,
        )
        return false
      }
      throw error
    }
    if (finalRefresh.missingNodeIds.length > 0) {
      this.logger.warning(
        `GitHub omitted ${finalRefresh.missingNodeIds.length} commit${finalRefresh.missingNodeIds.length === 1 ? '' : 's'} from the final association response. Release Drafter cannot safely classify their empty associations.`,
      )
      return false
    }
    this.logger.debug(
      `Final association refresh found ${finalRefresh.newlyAssociatedCount} newly associated commit${finalRefresh.newlyAssociatedCount === 1 ? '' : 's'}.`,
    )
    return true
  }

  /**
   * Polls only commits whose associations were initially empty. The loop starts
   * only after the recent PR check proves a contradiction, and the caller may
   * classify empty results as unassociated only when the contradiction clears.
   */
  private async waitForCommitAssociations(params: {
    params: FindChangesRequest
    commits: GraphCommit[]
    contradictoryAssociations: ContradictoryCommitAssociation[]
  }): Promise<boolean> {
    const { params: request, commits, contradictoryAssociations } = params
    const commitsById = new Map(
      commits.flatMap((commit) =>
        commit.id ? ([[commit.id, commit]] as const) : [],
      ),
    )
    const missingNodeIdCount = commits.filter(
      (commit) => !hasPullRequestAssociation(commit) && !commit.id,
    ).length
    if (missingNodeIdCount > 0) {
      this.logger.warning(
        `GitHub omitted node IDs for ${missingNodeIdCount} unresolved comparison commit${missingNodeIdCount === 1 ? '' : 's'}. Release Drafter cannot poll their pull request associations safely, so those commits will be omitted.`,
      )
      return false
    }

    this.logger.info(
      `GitHub returned contradictory pull request data for ${contradictoryAssociations.length} merge commit${contradictoryAssociations.length === 1 ? '' : 's'}. Polling commit associations for up to ${ASSOCIATION_POLL_TIMEOUT_MS / 1000} seconds before classifying individual commits.`,
    )
    const pollingDeadline = Date.now() + ASSOCIATION_POLL_TIMEOUT_MS
    this.logger.debug(
      `Waiting ${ASSOCIATION_INITIAL_QUIET_PERIOD_MS / 1000} seconds before the first association refresh.`,
    )
    await sleep(ASSOCIATION_INITIAL_QUIET_PERIOD_MS)

    for (let attempt = 1; attempt <= ASSOCIATION_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 1 && Date.now() >= pollingDeadline) break
      const unresolvedContradictions = contradictoryAssociations.filter(
        (contradiction) => !hasExpectedPullRequestAssociation(contradiction),
      )
      this.logger.debug(
        `Refreshing ${unresolvedContradictions.length} contradictory merge commit association${unresolvedContradictions.length === 1 ? '' : 's'} (attempt ${attempt}).`,
      )
      const remainingMilliseconds = pollingDeadline - Date.now()
      if (remainingMilliseconds <= 0) break
      let refresh: AssociationRefreshResult
      try {
        refresh = await this.refreshCommitAssociations(
          request,
          unresolvedContradictions.map(({ commit }) => commit),
          commitsById,
          AbortSignal.timeout(remainingMilliseconds),
        )
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'AbortError' || Date.now() >= pollingDeadline)
        ) {
          this.logger.warning(
            `GitHub commit association polling exceeded the ${ASSOCIATION_POLL_TIMEOUT_MS / 1000}-second limit. Release Drafter will leave commits with empty associations unresolved and omit them to prevent duplicate release entries.`,
          )
          return false
        }
        throw error
      }
      if (refresh.missingNodeIds.length > 0) {
        this.logger.warning(
          `GitHub omitted ${refresh.missingNodeIds.length} contradictory merge commit${refresh.missingNodeIds.length === 1 ? '' : 's'} from the association response. Release Drafter cannot continue polling safely.`,
        )
        return false
      }
      this.logger.debug(
        `Association refresh found ${refresh.newlyAssociatedCount} newly associated commit${refresh.newlyAssociatedCount === 1 ? '' : 's'}.`,
      )

      if (contradictoryAssociations.every(hasExpectedPullRequestAssociation)) {
        const unresolvedSiblingCandidates = [...commitsById.values()].filter(
          (commit) => !hasPullRequestAssociation(commit),
        )
        this.logger.info(
          `GitHub's delayed merge commit association became available after ${attempt} refresh attempt${attempt === 1 ? '' : 's'}.`,
        )
        if (unresolvedSiblingCandidates.length > 0) {
          const finalRefreshCompleted =
            await this.performFinalAssociationRefresh({
              params: request,
              commits: unresolvedSiblingCandidates,
              commitsById,
              reason:
                'The contradictory merge commit association is now available.',
            })
          if (!finalRefreshCompleted) return false
        }
        this.logger.info(
          'GitHub commit association polling settled. Remaining empty associations will be classified as unassociated commits.',
        )
        return true
      }

      if (attempt < ASSOCIATION_POLL_ATTEMPTS) {
        const delayMilliseconds = Math.min(
          ASSOCIATION_POLL_INTERVAL_MS,
          Math.max(0, pollingDeadline - Date.now()),
        )
        if (delayMilliseconds === 0) break
        this.logger.debug(
          `Merge commit associations are still delayed; retrying in ${delayMilliseconds / 1000} seconds.`,
        )
        await sleep(delayMilliseconds)
      }
    }

    this.logger.warning(
      `GitHub still returned contradictory pull request data after ${ASSOCIATION_POLL_TIMEOUT_MS / 1000} seconds. Release Drafter will leave commits with empty associations unresolved and omit them to prevent duplicate release entries.`,
    )
    return false
  }

  private async refreshCommitAssociations(
    params: FindChangesRequest,
    commits: GraphCommit[],
    commitsById: ReadonlyMap<string, GraphCommit>,
    signal?: AbortSignal,
  ): Promise<AssociationRefreshResult> {
    let newlyAssociatedCount = 0
    const nodeIds = commits.flatMap((commit) => (commit.id ? [commit.id] : []))
    const returnedNodeIds = new Set<string>()
    for (
      let offset = 0;
      offset < nodeIds.length;
      offset += ASSOCIATION_POLL_BATCH_SIZE
    ) {
      const ids = nodeIds.slice(offset, offset + ASSOCIATION_POLL_BATCH_SIZE)
      const data: {
        nodes?: Array<{
          id?: string
          associatedPullRequests?: GraphCommit['associatedPullRequests']
        } | null> | null
      } = await this.graphql(PollCommitAssociationsDocument.toString(), {
        ids,
        withPullRequestBody: params.pullRequestFields.body,
        withPullRequestURL: params.pullRequestFields.url,
        withBaseRefName: params.pullRequestFields.baseRefName,
        withHeadRefName: params.pullRequestFields.headRefName,
        ...(signal ? { request: { signal } } : {}),
      })

      for (const refreshedCommit of data.nodes ?? []) {
        if (!refreshedCommit?.id) continue
        returnedNodeIds.add(refreshedCommit.id)
        const commit = commitsById.get(refreshedCommit.id)
        if (!commit || !refreshedCommit.associatedPullRequests) continue
        const wasUnassociated = !hasPullRequestAssociation(commit)
        commit.associatedPullRequests = refreshedCommit.associatedPullRequests
        if (wasUnassociated && hasPullRequestAssociation(commit)) {
          newlyAssociatedCount += 1
        }
      }
    }
    return {
      newlyAssociatedCount,
      missingNodeIds: nodeIds.filter((nodeId) => !returnedNodeIds.has(nodeId)),
    }
  }

  private backfillRecentPullRequestAssociations(
    commitsByOid: ReadonlyMap<string, GraphCommit>,
    pullRequests: GraphPullRequest[],
  ) {
    const pullRequestsByMergeOid = new Map<string, GraphPullRequest[]>()
    for (const pullRequest of pullRequests) {
      const mergeCommitOid = pullRequest.mergeCommit?.oid
      if (!mergeCommitOid) continue
      const existing = pullRequestsByMergeOid.get(mergeCommitOid) ?? []
      existing.push(pullRequest)
      pullRequestsByMergeOid.set(mergeCommitOid, existing)
    }

    for (const [
      mergeCommitOid,
      matchingPullRequests,
    ] of pullRequestsByMergeOid) {
      const commit = commitsByOid.get(mergeCommitOid)
      if (!commit || hasPullRequestAssociation(commit)) continue
      commit.associatedPullRequests = {
        totalCount: matchingPullRequests.length,
        nodes: matchingPullRequests,
      }
    }
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

  async getPullRequest({
    repository,
    number,
  }: {
    repository: Repository
    number: number
  }): Promise<PullRequestValidationData> {
    const response = await this.octokit.rest.pulls.get({
      owner: repository.owner,
      repo: repository.name,
      pull_number: number,
    })
    const title = response.data.title?.trim()
    const baseRefName = response.data.base?.ref?.trim()
    if (!title)
      throw new Error(`Pull request #${number} returned a blank title`)
    if (!baseRefName)
      throw new Error(`Pull request #${number} returned a blank base branch`)

    return {
      number,
      title,
      baseRefName,
      labels: response.data.labels.flatMap((label) =>
        typeof label === 'string'
          ? label
            ? [label]
            : []
          : label.name
            ? [label.name]
            : [],
      ),
    }
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

  /**
   * Checks only proven direct commits with linked users and dates, using each
   * login's earliest commit as the cutoff. Prior merged PRs and commits reachable
   * from the base disqualify candidates; limits and failed checks omit them.
   */
  private async findNewCommitContributors(
    params: FindChangesRequest,
    commits: ChangeSet['commits'],
  ): Promise<NonNullable<ChangeSet['newCommitContributors']>> {
    const earliestCommitByLogin = new Map<string, string>()
    for (const commit of commits) {
      if (
        commit.associationStatus !== 'unassociated' ||
        !commit.author?.login ||
        !commit.committedAt
      ) {
        continue
      }
      const previous = earliestCommitByLogin.get(commit.author.login)
      if (!previous || commit.committedAt < previous) {
        earliestCommitByLogin.set(commit.author.login, commit.committedAt)
      }
    }
    // Reuse the PR-history lookup with each author's first direct commit as
    // the contribution cutoff.
    const noPriorPullRequest = await this.findNewContributorLogins(
      params.repository,
      [...earliestCommitByLogin].map(([login, committedAt]) => ({
        number: 0,
        title: '',
        mergedAt: committedAt,
        author: { __typename: 'User', login },
      })),
    )
    const candidates = [...noPriorPullRequest].slice(0, params.historyLimit)
    if (noPriorPullRequest.size > candidates.length) {
      this.logger.warning(
        `Skipped new-contributor checks for ${noPriorPullRequest.size - candidates.length} direct commit authors beyond the history-limit of ${params.historyLimit}.`,
      )
    }
    const results = await mapConcurrent(
      candidates,
      this.contributorConcurrency,
      async (login) => {
        try {
          const response = await this.octokit.rest.repos.listCommits({
            owner: params.repository.owner,
            repo: params.repository.name,
            sha: params.comparison.baseRef,
            author: login,
            per_page: 1,
          })
          return response.data.length === 0 ? { login } : undefined
        } catch (error) {
          this.logger.warning(
            `Could not determine whether ${login} is a new commit contributor. The contributor will not be labeled new. ${error instanceof Error ? error.message : String(error)}`,
          )
          return undefined
        }
      },
    )
    return results.filter((author) => author !== undefined)
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
          `GitHub could not resolve ${commitish} to a commit SHA. Release Drafter will use the default branch.`,
        )
        return ''
      }
    }
    if (commitish.startsWith('refs/pull/')) {
      const match = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish)
      if (!match) {
        this.logger.warning(
          `${commitish} is not a supported pull request ref. Release Drafter will use the default branch.`,
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
          `GitHub could not resolve ${commitish} to a commit SHA. Release Drafter will use the default branch.`,
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
    // GraphQL Blob.text can be null or truncated. It cannot return the exact raw
    // bytes. REST raw mode provides the required 404 and content-type checks. It
    // also supports the GHES base64 fallback below.
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
