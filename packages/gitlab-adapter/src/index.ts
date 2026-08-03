import type {
  ChangeSet,
  Commit,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeAdapter,
  ListReleasesRequest,
  PullRequest,
  Release,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
} from '@release-drafter/core'
import {
  GitLabClient,
  type GitLabCommit,
  type GitLabMergeRequest,
  type GitLabRelease,
} from './gitlab-client.ts'
import {
  defaultGitLabAdapterLimits,
  type GitLabAdapterOptions,
} from './types.ts'

export {
  defaultGitLabAdapterLimits,
  type GitLabAdapterLimits,
  type GitLabAdapterOptions,
  type GitLabFetch,
} from './types.ts'

export const GITLAB_ADAPTER_PACKAGE_NAME =
  '@release-drafter/gitlab-adapter' as const

const repositoryKey = (request: FindChangesRequest) =>
  `${request.repository.owner}/${request.repository.name}`
const mergeRequestKey = (repository: string, iid: number) =>
  `${repository}#${iid}`

const mapConcurrent = async <Input, Output>(
  inputs: readonly Input[],
  concurrency: number,
  callback: (input: Input, index: number) => Promise<Output>,
) => {
  const outputs = new Array<Output>(inputs.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(inputs.length, concurrency) }, async () => {
      while (next < inputs.length) {
        const index = next
        next += 1
        outputs[index] = await callback(inputs[index] as Input, index)
      }
    }),
  )
  return outputs
}

const normalizeCommit = (commit: GitLabCommit): Commit => {
  if (!commit.id)
    throw new Error('GitLab comparison contained a commit without an id')
  const committedAt =
    commit.committed_date ?? commit.authored_date ?? commit.created_at
  return {
    id: commit.id,
    oid: commit.id,
    ...(commit.message ? { message: commit.message } : {}),
    ...(committedAt ? { committedAt } : {}),
    ...(commit.author_name ? { author: { name: commit.author_name } } : {}),
  }
}

const normalizeMergeRequest = (
  request: FindChangesRequest,
  mergeRequest: GitLabMergeRequest,
): PullRequest => {
  if (!Number.isSafeInteger(mergeRequest.iid) || (mergeRequest.iid ?? 0) <= 0) {
    throw new Error('Associated GitLab merge request omitted a valid iid')
  }
  if (!mergeRequest.title) {
    throw new Error(
      `Associated GitLab merge request !${mergeRequest.iid} omitted its title`,
    )
  }
  const authorLogin = mergeRequest.author?.username?.trim()
  const baseRepository = repositoryKey(request)
  return {
    number: mergeRequest.iid as number,
    title: mergeRequest.title,
    baseRepository,
    isCrossRepository:
      mergeRequest.source_project_id !== undefined &&
      mergeRequest.target_project_id !== undefined &&
      mergeRequest.source_project_id !== mergeRequest.target_project_id,
    mergedAt: mergeRequest.merged_at ?? null,
    mergeCommitOid:
      mergeRequest.merge_commit_sha ?? mergeRequest.squash_commit_sha ?? null,
    labels: (mergeRequest.labels ?? []).flatMap((label) =>
      typeof label === 'string'
        ? label
          ? [label]
          : []
        : label.name
          ? [label.name]
          : [],
    ),
    ...(authorLogin
      ? {
          author: {
            login: authorLogin,
            ...(mergeRequest.author?.web_url
              ? { url: mergeRequest.author.web_url }
              : {}),
            ...(mergeRequest.author?.bot ? { type: 'Bot' as const } : {}),
          },
        }
      : {}),
    ...(request.pullRequestFields.body
      ? { body: mergeRequest.description ?? null }
      : {}),
    ...(request.pullRequestFields.url && mergeRequest.web_url
      ? { url: mergeRequest.web_url }
      : {}),
    ...(request.pullRequestFields.baseRefName && mergeRequest.target_branch
      ? { baseRefName: mergeRequest.target_branch }
      : {}),
    ...(request.pullRequestFields.headRefName && mergeRequest.source_branch
      ? { headRefName: mergeRequest.source_branch }
      : {}),
  }
}

const normalizeRelease = (release: GitLabRelease): Release => {
  if (!release.tag_name)
    throw new Error('GitLab release response omitted its tag name')
  return {
    id: release.tag_name,
    tagName: release.tag_name,
    ...(release.name !== undefined ? { name: release.name } : {}),
    ...(release.commit?.id ? { targetCommitish: release.commit.id } : {}),
    ...(release.released_at || release.created_at
      ? { createdAt: release.released_at ?? release.created_at }
      : {}),
    draft: false,
    prerelease: false,
    ...(release._links?.self || release.tag_path
      ? { url: release._links?.self ?? release.tag_path }
      : {}),
  }
}

const stableCommitOrder = (left: Commit, right: Commit) =>
  (left.committedAt ?? '').localeCompare(right.committedAt ?? '') ||
  left.oid.localeCompare(right.oid)
const stableMergeRequestOrder = (left: PullRequest, right: PullRequest) =>
  (left.mergedAt ?? '').localeCompare(right.mergedAt ?? '') ||
  left.number - right.number

export class GitLabAdapter implements ForgeAdapter {
  readonly capabilities = { draftReleases: false } as const

  constructor(private readonly options: GitLabAdapterOptions) {}

  private client(repository: FindChangesRequest['repository']) {
    return new GitLabClient(
      { ...this.options, defaults: defaultGitLabAdapterLimits },
      repository,
    )
  }

  async findChanges(request: FindChangesRequest): Promise<ChangeSet> {
    const client = this.client(request.repository)
    const project = client.project(request.repository)
    const budget = client.budget()
    const comparison = (
      await client.compare(
        project,
        request.comparison.baseRef,
        request.comparison.headRef,
        budget,
      )
    ).data
    if (comparison.compare_timeout) {
      client.logger.debug(
        'GitLab comparison timed out; GitLab guarantees the commits array remains complete, so merge-request discovery will continue.',
      )
    }
    if (!Array.isArray(comparison.commits)) {
      throw new Error(
        'GitLab comparison did not include a complete commits array',
      )
    }
    if (comparison.commits.length > client.limits.maxComparisonCommits) {
      throw new Error(
        `GitLab comparison contains ${comparison.commits.length} commits, above the ${client.limits.maxComparisonCommits} commit limit`,
      )
    }
    const commits = comparison.commits
      .map(normalizeCommit)
      .sort(stableCommitOrder)
    if (commits.length === 0) {
      return { commits: [], pullRequests: [], newContributorLogins: new Set() }
    }

    const associated = await mapConcurrent(
      commits,
      client.limits.concurrency,
      (commit) =>
        client.associatedMergeRequests(
          project,
          commit.oid,
          Math.min(
            Math.max(1, request.pullRequestLimit),
            client.limits.maxAssociatedMergeRequests,
          ),
          budget,
        ),
    )
    const mergeRequests = new Map<string, GitLabMergeRequest>()
    const keysByCommit = new Map<string, string[]>()
    for (const [index, candidates] of associated.entries()) {
      const keys: string[] = []
      for (const candidate of candidates) {
        if (
          candidate.state !== 'merged' ||
          !candidate.merged_at ||
          !candidate.iid
        )
          continue
        if (
          candidate.target_project_id !== undefined &&
          candidate.project_id !== undefined &&
          candidate.target_project_id !== candidate.project_id
        ) {
          continue
        }
        const key = mergeRequestKey(repositoryKey(request), candidate.iid)
        mergeRequests.set(key, candidate)
        keys.push(key)
      }
      keysByCommit.set(commits[index]?.oid ?? '', [...new Set(keys)].sort())
    }

    const normalizedByKey = new Map(
      [...mergeRequests].map(([key, mergeRequest]) => [
        key,
        normalizeMergeRequest(request, mergeRequest),
      ]),
    )

    if (request.includeChangedFiles) {
      await mapConcurrent(
        [...normalizedByKey.entries()],
        client.limits.concurrency,
        async ([, mergeRequest]) => {
          const changesCount = mergeRequests
            .get(mergeRequestKey(repositoryKey(request), mergeRequest.number))
            ?.changes_count?.trim()
          if (changesCount && !/^\d+$/.test(changesCount)) {
            throw new Error(
              `GitLab merge request !${mergeRequest.number} reported an invalid or capped changed-file count: ${changesCount}`,
            )
          }
          const advertised = changesCount ? Number(changesCount) : undefined
          if (advertised !== undefined && !Number.isSafeInteger(advertised)) {
            throw new Error(
              `GitLab merge request !${mergeRequest.number} reported an invalid or capped changed-file count: ${changesCount}`,
            )
          }
          if (
            advertised !== undefined &&
            advertised > client.limits.maxChangedFiles
          ) {
            throw new Error(
              `GitLab merge request !${mergeRequest.number} advertises ${advertised} changed files, above the ${client.limits.maxChangedFiles} file limit`,
            )
          }
          const diffs = await client.diffs(project, mergeRequest.number, budget)
          const files = [
            ...new Set(
              diffs.flatMap((diff) =>
                (diff.new_path ?? diff.old_path)
                  ? [diff.new_path ?? (diff.old_path as string)]
                  : [],
              ),
            ),
          ].sort()
          if (advertised !== undefined && files.length !== advertised) {
            throw new Error(
              `GitLab changed-file response for merge request !${mergeRequest.number} was incomplete: expected ${advertised} files but received ${files.length}`,
            )
          }
          mergeRequest.changedFiles = files
        },
      )
    }

    for (const commit of commits) {
      const keys = keysByCommit.get(commit.oid) ?? []
      const associatedPullRequests = keys.flatMap((key) => {
        const mergeRequest = normalizedByKey.get(key)
        return mergeRequest
          ? [
              {
                number: mergeRequest.number,
                baseRepository: mergeRequest.baseRepository,
              },
            ]
          : []
      })
      if (associatedPullRequests.length > 0) {
        commit.associatedPullRequests = associatedPullRequests
        const logins = associatedPullRequests.flatMap(({ number }) => {
          const mergeRequest = normalizedByKey.get(
            mergeRequestKey(repositoryKey(request), number),
          )
          return mergeRequest?.author
            ? [
                {
                  login: mergeRequest.author.login,
                  type: mergeRequest.author.type,
                },
              ]
            : []
        })
        commit.authors = [
          ...new Map(logins.map((author) => [author.login, author])).values(),
          ...(commit.author ? [commit.author] : []),
        ]
      }
    }

    const pullRequests = [...normalizedByKey.values()].sort(
      stableMergeRequestOrder,
    )
    const newContributorLogins = new Set<string>()
    if (request.includeNewContributors) {
      await mapConcurrent(
        pullRequests,
        client.limits.concurrency,
        async (pullRequest) => {
          const login = pullRequest.author?.login
          if (!login) return
          try {
            const expanded = (
              await client.mergeRequest(project, pullRequest.number, budget)
            ).data
            if (expanded.first_contribution === true) {
              newContributorLogins.add(login)
            } else if (expanded.first_contribution === undefined) {
              client.logger.warning(
                `GitLab did not report first_contribution for ${login}; the contributor will not be labeled new.`,
              )
            }
          } catch (error) {
            client.logger.warning(
              `Could not determine whether ${login} is a new contributor. The contributor will not be labeled new. ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        },
      )
    }
    return { commits, pullRequests, newContributorLogins }
  }

  async listReleases({ repository }: ListReleasesRequest): Promise<Release[]> {
    const client = this.client(repository)
    const releases = await client.releases(
      client.project(repository),
      client.budget(),
    )
    return releases
      .filter((release) => release.upcoming_release !== true)
      .map(normalizeRelease)
  }

  async resolveCommitish({
    repository,
    commitish,
  }: ResolveCommitishRequest): Promise<string> {
    if (commitish.startsWith('refs/heads/'))
      return commitish.slice('refs/heads/'.length)
    const client = this.client(repository)
    const project = client.project(repository)
    const mergeRequest = /^refs\/merge-requests\/(\d+)\/(head|merge)$/.exec(
      commitish,
    )
    if (commitish.startsWith('refs/merge-requests/')) {
      if (!mergeRequest) {
        client.logger.warning(
          `${commitish} is not a supported GitLab merge request ref, falling back to default branch`,
        )
        return ''
      }
      try {
        const response = (
          await client.mergeRequest(
            project,
            Number(mergeRequest[1]),
            client.budget(),
          )
        ).data
        const sha =
          mergeRequest[2] === 'head'
            ? response.sha
            : (response.merge_commit_sha ?? response.squash_commit_sha)
        if (!sha) throw new Error('merge request omitted the requested SHA')
        return sha
      } catch {
        client.logger.warning(
          `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
        )
        return ''
      }
    }
    if (!commitish.startsWith('refs/tags/')) return commitish
    try {
      const response = await client.tag(
        project,
        commitish.slice('refs/tags/'.length),
        client.budget(),
      )
      if (!response.data.commit?.id)
        throw new Error('tag omitted its commit id')
      return response.data.commit.id
    } catch {
      client.logger.warning(
        `${commitish} could not be resolved to a commit SHA, falling back to default branch`,
      )
      return ''
    }
  }

  async createRelease({ repository, payload }: CreateReleaseRequest) {
    const client = this.client(repository)
    const response = await client.createRelease(
      client.project(repository),
      {
        name: payload.name,
        tagName: payload.tag,
        description: payload.body,
        ref: payload.targetCommitish,
      },
      client.budget(),
    )
    return normalizeRelease(response.data)
  }

  async updateRelease({ repository, release, payload }: UpdateReleaseRequest) {
    const client = this.client(repository)
    const response = await client.updateRelease(
      client.project(repository),
      release.tagName,
      { name: payload.name, description: payload.body },
      client.budget(),
    )
    return normalizeRelease(response.data)
  }
}
