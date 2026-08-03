import type { ForgeAdapter, Repository } from '@release-drafter/core'
import {
  createGitHubCompatibleRestAdapter,
  type RestAdapterOptions,
  type RestForgeProfile,
} from '@release-drafter/rest-adapter'

export const FORGEJO_ADAPTER_PACKAGE_NAME =
  '@release-drafter/forgejo-adapter' as const

const encode = (value: string | number) => encodeURIComponent(String(value))
const repositoryPath = (repository: Repository) =>
  `/repos/${encode(repository.owner)}/${encode(repository.name)}`

/** Explicit Forgejo REST protocol profile. */
export const forgejoProfile = {
  capabilities: { draftReleases: true },
  apiPath: '/api/v1',
  authHeader: (token: string) => `token ${token}`,
  endpoints: {
    compare: (repository, baseHead) =>
      `${repositoryPath(repository)}/compare/${encode(baseHead)}`,
    commitPull: (repository, sha) =>
      `${repositoryPath(repository)}/commits/${encode(sha)}/pull`,
    pullFiles: (repository, number) =>
      `${repositoryPath(repository)}/pulls/${encode(number)}/files`,
    pulls: (repository) => `${repositoryPath(repository)}/pulls`,
    gitCommit: (repository, ref) =>
      `${repositoryPath(repository)}/git/commits/${encode(ref)}`,
    pull: (repository, number) =>
      `${repositoryPath(repository)}/pulls/${encode(number)}`,
    releases: (repository) => `${repositoryPath(repository)}/releases`,
    release: (repository, id) =>
      `${repositoryPath(repository)}/releases/${encode(id)}`,
  },
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
} as const satisfies RestForgeProfile

export class ForgejoAdapter implements ForgeAdapter {
  readonly capabilities = forgejoProfile.capabilities
  private readonly adapter: ForgeAdapter

  constructor(options: RestAdapterOptions) {
    this.adapter = createGitHubCompatibleRestAdapter(forgejoProfile, options)
  }

  listReleases: ForgeAdapter['listReleases'] = (params) =>
    this.adapter.listReleases(params)
  findChanges: ForgeAdapter['findChanges'] = (params) =>
    this.adapter.findChanges(params)
  resolveCommitish: ForgeAdapter['resolveCommitish'] = (params) =>
    this.adapter.resolveCommitish(params)
  createRelease: ForgeAdapter['createRelease'] = (params) =>
    this.adapter.createRelease(params)
  updateRelease: ForgeAdapter['updateRelease'] = (params) =>
    this.adapter.updateRelease(params)
}
