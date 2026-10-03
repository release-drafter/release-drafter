/** Receives log messages while Release Drafter calculates or writes a release. */
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

/** Reads configuration through the selected forge. */
export interface RepositoryConfigReader {
  getDefaultBranch(repository: Repository): Promise<string>
  getRepositoryConfig(options: {
    repository: Repository
    path: string
    ref?: string
  }): Promise<string>
}

/** Bundled adapters support release operations and configuration loading. */
export type BundledForgeAdapter = ForgeAdapter & RepositoryConfigReader

/** Optional values applied after configuration inheritance and validation. */
export interface ConfigOverrides {
  commitish?: string
  header?: string
  footer?: string
  latest?: boolean
  prerelease?: boolean
  'prerelease-identifier'?: string
  'include-pre-releases'?: boolean
  'filter-by-range'?: string
}

/** Options for the standard forge-neutral configuration loader. */
export interface LoadConfigOptions {
  adapter: RepositoryConfigReader
  repository: Repository
  /** Defaults to `release-drafter.yml` in the repository's `.github/` directory. */
  target?: string
  /** Defaults to the repository's default branch. */
  ref?: string
  /** Base directory for `file:` targets. Defaults to the current working directory. */
  cwd?: string
  overrides?: ConfigOverrides
  logger?: Logger
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
 * An implementation can support a forge if it can map the forge's release model
 * to this interface.
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

export type ParsedReplacer =
  | {
      search: RegExp
      replace: string
      section?: never
      /** Defaults to `global`, the generated release body. Change title/body targets run before escaping. */
      target?: 'global' | 'change-body' | 'change-title'
      /** Retain the current input (`full`, the default) or clear it when search does not match. */
      'not-found'?: 'empty' | 'full'
    }
  | {
      /** Select the section under an ATX heading, such as `## Release information`. */
      section: string
      target: 'change-body'
      search?: never
      replace?: never
      /** Retain the current body (`full`, the default) or clear it when the heading is absent. */
      'not-found'?: 'empty' | 'full'
    }

export interface ParsedGroupChange {
  pattern: RegExp
  'title-template': string
  /** Names of the capture groups that build the grouping key: `group` and every `group_<name>`. */
  groupNames: string[]
  /** Names of the capture groups exposed as `$FIRST_<NAME>` and `$LAST_<NAME>`, without the grouping ones. */
  captureNames: string[]
}

/**
 * Fully parsed Release Drafter configuration for the orchestration core. The
 * standard `loadConfig` helper returns this shape. Applications can also supply
 * their own parsed configuration.
 */
export interface DraftReleaseConfig {
  'change-template': string
  'change-author-template': string
  'change-authors-separator': string
  'change-authors-final-separator'?: string
  'change-title-escapes'?: string
  'change-body-escapes'?: string
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
  'group-changes'?: ParsedGroupChange[]
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
  /** Unique, sorted labels matched by configuration conditions on included pull requests. */
  labels: string[]
}

export interface DraftReleaseOptions {
  adapter: ForgeAdapter
  config: DraftReleaseConfig
  input: ReleaseInput
  repository: Repository
  logger?: Logger
}
