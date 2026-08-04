import * as releaseDrafterCore from '@release-drafter/core'
import { ForgejoAdapter } from '@release-drafter/forgejo-adapter'
import { GiteaAdapter } from '@release-drafter/gitea-adapter'
import { GitHubAdapter } from '@release-drafter/github-adapter'
import { GitLabAdapter } from '@release-drafter/gitlab-adapter'

/** Receives lifecycle messages emitted while calculating or writing a release. */
export interface Logger {
  debug(message: string): void
  info(message: string): void
  warning(error: string | Error): void
  error(error: string | Error): void
}

export interface Repository {
  owner: string
  name: string
  serverUrl: string
}

export interface ReleaseAuthor {
  login: string
  url?: string
  type?: 'Bot' | 'User' | string
}

export interface PullRequest {
  number: number
  title: string
  body?: string | null
  url?: string
  mergedAt?: string | null
  baseRefName?: string
  headRefName?: string
  baseRepository?: string | null
  isCrossRepository?: boolean
  author?: ReleaseAuthor | null
  labels?: string[]
  changedFiles?: string[]
  mergeCommitOid?: string | null
}

export interface CommitAuthor {
  name?: string | null
  login?: string | null
  type?: string
}

export interface Commit {
  id?: string
  oid: string
  committedAt?: string
  message?: string
  author?: CommitAuthor | null
  authors?: (CommitAuthor | null)[] | null
  associatedPullRequests?:
    | (Pick<PullRequest, 'number' | 'baseRepository'> | null)[]
    | null
}

export interface Release {
  id: string | number
  tagName: string
  name?: string | null
  targetCommitish?: string
  createdAt?: string
  draft?: boolean
  prerelease?: boolean
  url?: string
  uploadUrl?: string
}

export interface ChangeSet {
  commits: Commit[]
  pullRequests: PullRequest[]
  newContributorLogins: ReadonlySet<string>
}

export interface ReleasePayload {
  name: string
  tag: string
  body: string
  targetCommitish: string
  prerelease: boolean
  makeLatest: boolean
  draft: boolean
  resolvedVersion?: string
  majorVersion?: string | null
  minorVersion?: string | null
  patchVersion?: string | null
  prereleaseVersion?: string | null
}

export interface FindChangesRequest {
  repository: Repository
  comparison: {
    baseRef: string
    headRef: string
  }
  pullRequestFields: {
    body: boolean
    url: boolean
    baseRefName: boolean
    headRefName: boolean
  }
  pullRequestLimit: number
  historyLimit: number
  includeChangedFiles: boolean
  includeNewContributors: boolean
}

export interface ListReleasesRequest {
  repository: Repository
}

export interface ResolveCommitishRequest {
  repository: Repository
  commitish: string
}

export interface CreateReleaseRequest {
  repository: Repository
  payload: ReleasePayload
}

export interface UpdateReleaseRequest {
  repository: Repository
  release: Release
  payload: ReleasePayload
}

/**
 * Forge operations required by Release Drafter.
 *
 * Implementations can target any forge whose release model can be normalized to
 * this interface.
 */
export interface ForgeAdapter {
  readonly capabilities: {
    draftReleases: boolean
  }
  listReleases(params: ListReleasesRequest): Promise<Release[]>
  findChanges(params: FindChangesRequest): Promise<ChangeSet>
  resolveCommitish(params: ResolveCommitishRequest): Promise<string>
  createRelease(params: CreateReleaseRequest): Promise<Release>
  updateRelease(params: UpdateReleaseRequest): Promise<Release>
}

export type ForgeName = 'github' | 'gitea' | 'forgejo' | 'gitlab'

export type ForgeFetch = typeof globalThis.fetch

interface CommonForgeAdapterOptions {
  token: string
  serverUrl?: string
  apiUrl?: string
  logger?: Logger
  fetch?: ForgeFetch
}

export interface RestForgeAdapterLimits {
  timeoutMs: number
  maxResponseBytes: number
  maxComparisonBytes: number
  maxComparisonCommits: number
  maxPages: number
  pageSize: number
  maxItemsPerList: number
  maxChangedFiles: number
  maxRequestsPerOperation: number
  concurrency: number
}

export interface GitLabForgeAdapterLimits extends RestForgeAdapterLimits {
  maxAssociatedMergeRequests: number
  retries: number
  retryBaseDelayMs: number
  maxRetryDelayMs: number
}

export interface GitHubForgeAdapterOptions extends CommonForgeAdapterOptions {
  forge: 'github'
  graphqlUrl?: string
  env?: Record<string, string | undefined>
  requestAgent?: object
  requestRetries?: number
  changedFilesConcurrency?: number
  contributorConcurrency?: number
}

export interface GiteaForgeAdapterOptions extends CommonForgeAdapterOptions {
  forge: 'gitea'
  limits?: Partial<RestForgeAdapterLimits>
}

export interface ForgejoForgeAdapterOptions extends CommonForgeAdapterOptions {
  forge: 'forgejo'
  limits?: Partial<RestForgeAdapterLimits>
}

export interface GitLabForgeAdapterOptions extends CommonForgeAdapterOptions {
  forge: 'gitlab'
  limits?: Partial<GitLabForgeAdapterLimits>
}

export type CreateForgeAdapterOptions =
  | GitHubForgeAdapterOptions
  | GiteaForgeAdapterOptions
  | ForgejoForgeAdapterOptions
  | GitLabForgeAdapterOptions

/** Constructs a bundled forge adapter from a stable structural option shape. */
export const createForgeAdapter = (
  options: CreateForgeAdapterOptions,
): ForgeAdapter => {
  const defaults: Record<ForgeName, string> = {
    github: 'https://github.com',
    gitea: 'https://gitea.com',
    forgejo: 'https://codeberg.org',
    gitlab: 'https://gitlab.com',
  }
  const adapterOptions = {
    ...options,
    serverUrl: options.serverUrl ?? defaults[options.forge],
  }
  switch (options.forge) {
    case 'github':
      return new GitHubAdapter(adapterOptions)
    case 'gitea':
      return new GiteaAdapter(adapterOptions)
    case 'forgejo':
      return new ForgejoAdapter(adapterOptions)
    case 'gitlab':
      return new GitLabAdapter(adapterOptions)
  }
}

export interface ParsedChangeCondition {
  labels: string[]
  paths: string[]
  'labels-mode': 'any' | 'all' | 'only' | 'exactly'
  'paths-mode': 'any' | 'all' | 'only' | 'exactly'
  conventional?: {
    types: string[]
    scopes: string[]
    breaking?: boolean
  }
}

export type ParsedCategory =
  | {
      type: 'changelog'
      when: ParsedChangeCondition[]
      'collapse-after': number
      'semver-increment': 'major' | 'minor' | 'patch'
      exclusive: boolean
      title?: string
    }
  | {
      type: 'version-resolver'
      when: ParsedChangeCondition[]
      'semver-increment': 'major' | 'minor' | 'patch'
      exclusive: boolean
    }
  | {
      type: 'pre-include' | 'pre-exclude'
      when: ParsedChangeCondition[]
    }

export interface ParsedReplacer {
  search: RegExp
  replace: string
}

/**
 * Fully parsed Release Drafter configuration accepted by the orchestration
 * core. Config loading and normalization belong to the caller or its runtime.
 */
export interface DraftReleaseConfig {
  'change-template': string
  'change-author-template': string
  'change-authors-separator': string
  'change-authors-final-separator'?: string
  'change-title-escapes'?: string
  'no-changes-template': string
  'version-template': string
  'name-template'?: string
  'tag-prefix'?: string
  'tag-template'?: string
  'exclude-contributors': string[]
  'new-contributor-template': string
  'no-new-contributor-template': string
  'no-contributors-template': string
  'sort-by': 'merged_at' | 'title'
  'sort-direction': 'ascending' | 'descending'
  'filter-by-commitish': boolean
  'pull-request-limit': number
  'history-limit': number
  replacers: ParsedReplacer[]
  categories: ParsedCategory[]
  'category-template': string
  template: string
  latest: boolean
  prerelease: boolean
  'prerelease-identifier'?: string
  'include-pre-releases'?: boolean
  commitish: string
  header?: string
  footer?: string
  'filter-by-range'?: string
}

export interface ReleaseInput {
  /** Ref, tag, branch, or commit SHA used only as the change comparison base. */
  from?: string
  name?: string
  tag?: string
  version?: string
  publish: boolean
  dryRun?: boolean
}

export type ReleasePlan =
  | {
      action: 'create'
      draftRelease?: never
      releasePayload: ReleasePayload
    }
  | {
      action: 'update'
      draftRelease: Release
      releasePayload: ReleasePayload
    }
  | {
      action: 'dry-run'
      draftRelease?: Release
      releasePayload: ReleasePayload
    }

export interface DraftReleaseResult {
  plan: ReleasePlan
  release?: Release
  releasePayload: ReleasePayload
}

export interface DraftReleaseOptions {
  adapter: ForgeAdapter
  config: DraftReleaseConfig
  input: ReleaseInput
  repository: Repository
  logger?: Logger
}

const defaultLogger: Logger = {
  debug() {},
  info() {},
  warning() {},
  error() {},
}

/**
 * Calculates and optionally creates or updates a release through an injected
 * forge adapter.
 */
export const draftRelease = async (
  options: DraftReleaseOptions,
): Promise<DraftReleaseResult> => {
  const result = (await releaseDrafterCore.draftRelease({
    adapter: options.adapter,
    config: options.config,
    input: options.input,
    logger: options.logger ?? defaultLogger,
    repository: options.repository,
  })) as DraftReleaseResult

  return {
    plan: result.plan,
    release: result.release,
    releasePayload: result.releasePayload,
  }
}

/** Package identity for the public Release Drafter facade. */
export const RELEASE_DRAFTER_PACKAGE_NAME = 'release-drafter' as const
