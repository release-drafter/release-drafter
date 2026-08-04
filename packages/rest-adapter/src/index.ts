import type {
  ChangeSet,
  Commit,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeAdapter,
  ListReleasesRequest,
  PullRequest,
  Release,
  Repository,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
} from '@release-drafter/core'
import { mapConcurrent, RestClient } from './client.ts'
import type {
  PullRequestEntry,
  RestAdapterOptions,
  RestCommit,
  RestForgeProfile,
  RestPullRequest,
  RestRelease,
  RestUser,
} from './types.ts'

export const REST_ADAPTER_PACKAGE_NAME =
  '@release-drafter/rest-adapter' as const

const encoded = (value: string | number) => encodeURIComponent(String(value))
const repositoryKey = (repository: Repository) =>
  `${repository.owner}/${repository.name}`
const pullRequestKey = (repository: Repository, number: number) =>
  `${repositoryKey(repository)}#${number}`

const loginOf = (user: RestUser | null | undefined) =>
  user?.login?.trim() || user?.username?.trim() || undefined

const normalizeCommit = (commit: RestCommit): Commit => {
  if (!commit.sha)
    throw new Error('Comparison contained a commit without a SHA')
  const login = loginOf(commit.author)
  const name = commit.commit?.author?.name ?? undefined
  const committedAt =
    commit.commit?.committer?.date ??
    commit.commit?.author?.date ??
    commit.created
  return {
    id: commit.sha,
    oid: commit.sha,
    ...(committedAt ? { committedAt } : {}),
    ...(commit.commit?.message ? { message: commit.commit.message } : {}),
    ...(login || name
      ? { author: { ...(name ? { name } : {}), ...(login ? { login } : {}) } }
      : {}),
  }
}

const normalizePullRequest = (
  repository: Repository,
  pullRequest: RestPullRequest,
  selection: FindChangesRequest['pullRequestFields'],
): PullRequestEntry => {
  if (
    !Number.isSafeInteger(pullRequest.number) ||
    (pullRequest.number ?? 0) <= 0
  ) {
    throw new Error('Associated pull request did not contain a valid number')
  }
  const number = pullRequest.number as number
  if (!pullRequest.title) {
    throw new Error(
      `Associated pull request #${number} did not contain a title`,
    )
  }
  const login = loginOf(pullRequest.user)
  const baseRepository =
    pullRequest.base?.repo?.full_name ?? repositoryKey(repository)
  const headRepository = pullRequest.head?.repo?.full_name
  const normalized: PullRequest = {
    number,
    title: pullRequest.title,
    baseRepository,
    isCrossRepository:
      headRepository !== undefined && headRepository !== baseRepository,
    mergedAt: pullRequest.merged_at ?? null,
    mergeCommitOid: pullRequest.merge_commit_sha ?? null,
    labels: (pullRequest.labels ?? []).flatMap((label) => {
      if (typeof label === 'string') return label ? [label] : []
      return label?.name ? [label.name] : []
    }),
    ...(login
      ? {
          author: {
            login,
            ...(pullRequest.user?.html_url
              ? { url: pullRequest.user.html_url }
              : {}),
            ...(pullRequest.user?.type ? { type: pullRequest.user.type } : {}),
          },
        }
      : {}),
    ...(selection.body ? { body: pullRequest.body ?? null } : {}),
    ...(selection.url && pullRequest.html_url
      ? { url: pullRequest.html_url }
      : {}),
    ...(selection.baseRefName && pullRequest.base?.ref
      ? { baseRefName: pullRequest.base.ref }
      : {}),
    ...(selection.headRefName && pullRequest.head?.ref
      ? { headRefName: pullRequest.head.ref }
      : {}),
  }
  return {
    raw: pullRequest,
    normalized,
    key: `${baseRepository}#${number}`,
  }
}

const normalizeRelease = (release: RestRelease): Release => {
  if (release.id === undefined || !release.tag_name) {
    throw new Error('Release response omitted its id or tag name')
  }
  return {
    id: release.id,
    tagName: release.tag_name,
    ...(release.name !== undefined ? { name: release.name } : {}),
    ...(release.target_commitish
      ? { targetCommitish: release.target_commitish }
      : {}),
    ...(release.created_at ? { createdAt: release.created_at } : {}),
    ...(release.draft !== undefined ? { draft: release.draft } : {}),
    ...(release.prerelease !== undefined
      ? { prerelease: release.prerelease }
      : {}),
    ...(release.html_url || release.url
      ? { url: release.html_url ?? release.url ?? undefined }
      : {}),
    ...(release.upload_url ? { uploadUrl: release.upload_url } : {}),
  }
}

const stableCommitOrder = (left: Commit, right: Commit) =>
  (left.committedAt ?? '').localeCompare(right.committedAt ?? '') ||
  left.oid.localeCompare(right.oid)
const stablePullRequestOrder = (left: PullRequest, right: PullRequest) =>
  (left.mergedAt ?? '').localeCompare(right.mergedAt ?? '') ||
  (left.baseRepository ?? '').localeCompare(right.baseRepository ?? '') ||
  left.number - right.number

class GitHubCompatibleRestAdapter implements ForgeAdapter {
  readonly capabilities: RestForgeProfile['capabilities']
  private readonly client: RestClient

  constructor(
    private readonly profile: RestForgeProfile,
    options: RestAdapterOptions,
  ) {
    this.capabilities = profile.capabilities
    this.client = new RestClient(profile, options)
  }

  async findChanges(params: FindChangesRequest): Promise<ChangeSet> {
    const budget = this.client.newBudget()
    const comparisonResponse = await this.client.requestJson<
      Record<string, unknown>
    >({
      repository: params.repository,
      path: this.profile.endpoints.compare(
        params.repository,
        `${params.comparison.baseRef}...${params.comparison.headRef}`,
      ),
      budget,
      maxBytes: this.client.limits.maxComparisonBytes,
    })
    const comparison = comparisonResponse?.data
    const commitsValue = comparison?.[this.profile.response.comparison.commits]
    const totalValue =
      comparison?.[this.profile.response.comparison.totalCommits]
    if (
      !Array.isArray(commitsValue) ||
      typeof totalValue !== 'number' ||
      !Number.isSafeInteger(totalValue)
    ) {
      throw new Error(
        'Comparison response did not prove completeness with commits and total commit count',
      )
    }
    if (totalValue > this.client.limits.maxComparisonCommits) {
      throw new Error(
        `Comparison contains ${totalValue} commits, above the ${this.client.limits.maxComparisonCommits} commit limit`,
      )
    }
    if (commitsValue.length !== totalValue) {
      throw new Error(
        `Comparison was incomplete or truncated: expected ${totalValue} commits but received ${commitsValue.length}`,
      )
    }
    const rawCommits = commitsValue as RestCommit[]
    const commits = rawCommits.map(normalizeCommit).sort(stableCommitOrder)
    if (commits.length === 0) {
      return { commits: [], pullRequests: [], newContributorLogins: new Set() }
    }

    budget.ensureAvailable(
      commits.length + (params.includeChangedFiles ? 1 : 0),
    )
    const associated = await mapConcurrent(
      commits,
      this.client.limits.concurrency,
      async (commit) => {
        const response = await this.client.requestJson<RestPullRequest>({
          repository: params.repository,
          path: this.profile.endpoints.commitPull(
            params.repository,
            commit.oid,
          ),
          budget,
          notFound: 'return-undefined',
        })
        return response?.data
      },
    )
    const entriesByKey = new Map<string, PullRequestEntry>()
    const entryByCommit = new Map<string, PullRequestEntry>()
    for (const [index, pullRequest] of associated.entries()) {
      if (!pullRequest) continue
      if (pullRequest.merged === false || !pullRequest.merged_at) continue
      const entry = normalizePullRequest(
        params.repository,
        pullRequest,
        params.pullRequestFields,
      )
      if (
        entry.normalized.baseRepository !== repositoryKey(params.repository)
      ) {
        continue
      }
      entriesByKey.set(entry.key, entry)
      entryByCommit.set(commits[index]?.oid ?? '', entry)
    }

    const entries = [...entriesByKey.values()]
    if (params.includeChangedFiles) {
      await mapConcurrent(
        entries,
        this.client.limits.concurrency,
        async (entry) => {
          const advertised = entry.raw.changed_files
          if (
            Number.isSafeInteger(advertised) &&
            (advertised as number) > this.client.limits.maxChangedFiles
          ) {
            throw new Error(
              `Pull request #${entry.normalized.number} advertises ${advertised} changed files, above the ${this.client.limits.maxChangedFiles} file limit`,
            )
          }
          const files = await this.client.paginate<{
            filename?: string | null
          }>({
            repository: params.repository,
            path: this.profile.endpoints.pullFiles(
              params.repository,
              entry.normalized.number,
            ),
            budget,
            maxItems: this.client.limits.maxChangedFiles,
          })
          const paths = files.flatMap((file) =>
            file?.filename ? [file.filename] : [],
          )
          if (Number.isSafeInteger(advertised) && paths.length !== advertised) {
            throw new Error(
              `Changed-file response for pull request #${entry.normalized.number} was incomplete: expected ${advertised} files but received ${paths.length}`,
            )
          }
          entry.normalized.changedFiles = [...new Set(paths)].sort()
        },
      )
    }

    for (const commit of commits) {
      const entry = entryByCommit.get(commit.oid)
      if (!entry) continue
      commit.associatedPullRequests = [
        {
          number: entry.normalized.number,
          baseRepository: entry.normalized.baseRepository,
        },
      ]
      const pullAuthor = entry.normalized.author
      const commitAuthor = commit.author
      commit.authors = [
        ...(pullAuthor
          ? [
              {
                login: pullAuthor.login,
                type: pullAuthor.type,
              },
            ]
          : []),
        ...(commitAuthor?.login !== pullAuthor?.login && commitAuthor
          ? [commitAuthor]
          : []),
      ]
    }

    const pullRequests = entries
      .map((entry) => entry.normalized)
      .sort(stablePullRequestOrder)
    const newContributorLogins = params.includeNewContributors
      ? await this.findNewContributors(params, entries, budget)
      : new Set<string>()
    return { commits, pullRequests, newContributorLogins }
  }

  private async findNewContributors(
    params: FindChangesRequest,
    entries: PullRequestEntry[],
    budget: ReturnType<RestClient['newBudget']>,
  ) {
    const earliestByLogin = new Map<string, PullRequestEntry>()
    for (const entry of entries) {
      const login = entry.normalized.author?.login
      if (!login || !entry.normalized.mergedAt) continue
      const previous = earliestByLogin.get(login)
      if (
        !previous ||
        (entry.normalized.mergedAt ?? '') < (previous.normalized.mergedAt ?? '')
      ) {
        earliestByLogin.set(login, entry)
      }
    }
    const currentKeys = new Set(entries.map((entry) => entry.key))
    const results = await mapConcurrent(
      [...earliestByLogin],
      this.client.limits.concurrency,
      async ([login, earliest]) => {
        try {
          const list = this.profile.response.pullRequestList
          const history = await this.client.paginate<RestPullRequest | null>({
            repository: params.repository,
            path: this.profile.endpoints.pulls(params.repository),
            budget,
            pageSize: params.historyLimit,
            query: {
              [list.authorParameter]: login,
              [list.stateParameter]: list.closedState,
              [list.sortParameter]: list.oldestSort,
            },
          })
          const priorMerged = history.some((pullRequest) => {
            if (!pullRequest?.merged_at || !pullRequest.number) return false
            return (
              pullRequest.merged_at < (earliest.normalized.mergedAt ?? '') &&
              !currentKeys.has(
                pullRequestKey(params.repository, pullRequest.number),
              )
            )
          })
          return priorMerged ? undefined : login
        } catch (error) {
          this.client.logger.warning(
            `Could not prove whether ${login} is a new contributor within the bounded pull-request history. The contributor will not be labeled new. ${error instanceof Error ? error.message : String(error)}`,
          )
          return undefined
        }
      },
    )
    return new Set(results.flatMap((login) => (login ? [login] : [])))
  }

  async listReleases({ repository }: ListReleasesRequest): Promise<Release[]> {
    const releases = await this.client.paginate<RestRelease>({
      repository,
      path: this.profile.endpoints.releases(repository),
      budget: this.client.newBudget(),
    })
    return releases.map(normalizeRelease)
  }

  async resolveCommitish({
    repository,
    commitish,
  }: ResolveCommitishRequest): Promise<string> {
    if (commitish.startsWith('refs/heads/')) {
      return this.profile.qualifiedRefMode === 'preserve'
        ? commitish
        : commitish.replace(/^refs\/heads\//, '')
    }
    const pullMatch = /^refs\/pull\/(\d+)\/(head|merge)$/.exec(commitish)
    if (commitish.startsWith('refs/pull/')) {
      if (!pullMatch) {
        this.client.logger.warning(
          `${commitish} is not a supported pull request ref, falling back to default branch`,
        )
        return ''
      }
      try {
        const response = await this.client.requestJson<RestPullRequest>({
          repository,
          path: this.profile.endpoints.pull(repository, Number(pullMatch[1])),
          budget: this.client.newBudget(),
        })
        const sha =
          pullMatch[2] === 'head'
            ? response?.data.head?.sha
            : response?.data.merge_commit_sha
        if (!sha)
          throw new Error('Pull request response omitted the requested SHA')
        return sha
      } catch {
        this.client.logger.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )
        return ''
      }
    }
    if (!commitish.startsWith('refs/tags/')) return commitish
    if (this.profile.qualifiedRefMode === 'preserve') return commitish
    try {
      return await this.resolveTag(
        repository,
        commitish,
        this.client.newBudget(),
      )
    } catch {
      this.client.logger.warning(
        `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
      )
      return ''
    }
  }

  private async resolveTag(
    repository: Repository,
    ref: string,
    budget: ReturnType<RestClient['newBudget']>,
  ) {
    const response = await this.client.requestJson<RestCommit>({
      repository,
      path: this.profile.endpoints.gitCommit(
        repository,
        ref.replace(/^refs\/tags\//, ''),
      ),
      budget,
    })
    if (!response?.data.sha)
      throw new Error(`${ref} did not resolve to a commit`)
    return response.data.sha
  }

  async createRelease({
    repository,
    payload,
  }: CreateReleaseRequest): Promise<Release> {
    const response = await this.client.requestJson<RestRelease>({
      repository,
      path: this.profile.endpoints.releases(repository),
      budget: this.client.newBudget(),
      method: 'POST',
      body: {
        body: payload.body,
        draft: payload.draft,
        name: payload.name,
        prerelease: payload.prerelease,
        tag_name: payload.tag,
        target_commitish: payload.targetCommitish,
      },
    })
    return normalizeRelease(response?.data ?? {})
  }

  async updateRelease({
    repository,
    release,
    payload,
  }: UpdateReleaseRequest): Promise<Release> {
    const response = await this.client.requestJson<RestRelease>({
      repository,
      path: this.profile.endpoints.release(repository, release.id),
      budget: this.client.newBudget(),
      method: 'PATCH',
      body: {
        body: payload.body,
        draft: payload.draft,
        name: payload.name || release.name || undefined,
        prerelease: payload.prerelease,
        tag_name: payload.tag || release.tagName,
        target_commitish: payload.targetCommitish,
      },
    })
    return normalizeRelease(response?.data ?? {})
  }
}

/** Creates a bounded REST adapter from an explicit forge protocol profile. */
export const createGitHubCompatibleRestAdapter = (
  profile: RestForgeProfile,
  options: RestAdapterOptions,
): ForgeAdapter => new GitHubCompatibleRestAdapter(profile, options)

export const createRestEndpoints = () => {
  const repoPath = (repository: Repository) =>
    `/repos/${encoded(repository.owner)}/${encoded(repository.name)}`
  return {
    compare: (repository: Repository, baseHead: string) =>
      `${repoPath(repository)}/compare/${encoded(baseHead)}`,
    commitPull: (repository: Repository, sha: string) =>
      `${repoPath(repository)}/commits/${encoded(sha)}/pull`,
    pullFiles: (repository: Repository, number: number) =>
      `${repoPath(repository)}/pulls/${encoded(number)}/files`,
    pulls: (repository: Repository) => `${repoPath(repository)}/pulls`,
    gitCommit: (repository: Repository, ref: string) =>
      `${repoPath(repository)}/git/commits/${encoded(ref)}`,
    pull: (repository: Repository, number: number) =>
      `${repoPath(repository)}/pulls/${encoded(number)}`,
    releases: (repository: Repository) => `${repoPath(repository)}/releases`,
    release: (repository: Repository, id: string | number) =>
      `${repoPath(repository)}/releases/${encoded(id)}`,
  } satisfies RestForgeProfile['endpoints']
}

/** Creates the shared REST profile with forge-specific qualified-ref behavior. */
export const createGiteaCompatibleRestProfile = (
  qualifiedRefMode: RestForgeProfile['qualifiedRefMode'],
) =>
  ({
    capabilities: { draftReleases: true },
    qualifiedRefMode,
    apiPath: '/api/v1',
    authHeader: (token: string) => `token ${token}`,
    endpoints: createRestEndpoints(),
    response: {
      comparison: { commits: 'commits', totalCommits: 'total_commits' },
      pagination: {
        pageParameter: 'page',
        limitParameter: 'limit',
        totalCountHeader: 'x-total-count',
      },
      pullRequestList: {
        authorParameter: 'poster',
        stateParameter: 'state',
        closedState: 'closed',
        sortParameter: 'sort',
        oldestSort: 'oldest',
      },
    },
  }) as const satisfies RestForgeProfile

export { defaultRestAdapterLimits } from './client.ts'
export type {
  RestAdapterLimits,
  RestAdapterOptions,
  RestForgeProfile,
} from './types.ts'
