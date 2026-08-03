import type {
  Commit,
  ForgeAdapter,
  Logger,
  PullRequest,
  Release,
  Repository,
} from '@release-drafter/core'

export type Fetch = typeof globalThis.fetch

export type RestEndpointProfile = {
  compare(repository: Repository, baseHead: string): string
  commitPull(repository: Repository, sha: string): string
  pullFiles(repository: Repository, number: number): string
  pulls(repository: Repository): string
  gitCommit(repository: Repository, ref: string): string
  pull(repository: Repository, number: number): string
  releases(repository: Repository): string
  release(repository: Repository, id: string | number): string
}

export type RestResponseProfile = {
  comparison: {
    commits: string
    totalCommits: string
  }
  pagination: {
    pageParameter: string
    limitParameter: string
    totalCountHeader: string
  }
  pullRequestList: {
    authorParameter: string
    stateParameter: string
    closedState: string
    sortParameter: string
    oldestSort: string
  }
}

export type RestForgeProfile = {
  readonly capabilities: {
    draftReleases: boolean
  }
  readonly apiPath: string
  readonly authHeader: (token: string) => string
  readonly endpoints: RestEndpointProfile
  readonly response: RestResponseProfile
}

export type RestAdapterLimits = {
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

export type RestAdapterOptions = {
  token: string
  fetch?: Fetch
  logger?: Logger
  serverUrl?: string
  apiUrl?: string
  limits?: Partial<RestAdapterLimits>
}

export type RestForgeAdapter = ForgeAdapter & {
  readonly profile: RestForgeProfile
  readonly serverUrl?: string
  readonly apiUrl?: string
}

export type NormalizedComparison = {
  commits: Commit[]
  rawCommits: RestCommit[]
}

export type RestUser = {
  login?: string | null
  username?: string | null
  html_url?: string | null
  avatar_url?: string | null
  type?: string | null
}

export type RestCommit = {
  sha?: string
  created?: string | null
  author?: RestUser | null
  commit?: {
    message?: string | null
    author?: {
      name?: string | null
      date?: string | null
    } | null
    committer?: {
      name?: string | null
      date?: string | null
    } | null
  } | null
}

export type RestPullRequest = {
  number?: number
  title?: string | null
  body?: string | null
  html_url?: string | null
  merged?: boolean
  merged_at?: string | null
  merge_commit_sha?: string | null
  changed_files?: number | null
  user?: RestUser | null
  labels?: Array<string | { name?: string | null } | null> | null
  base?: {
    ref?: string | null
    repo?: { full_name?: string | null } | null
  } | null
  head?: {
    ref?: string | null
    sha?: string | null
    repo?: { full_name?: string | null } | null
  } | null
}

export type RestRelease = {
  id?: string | number
  tag_name?: string | null
  name?: string | null
  target_commitish?: string | null
  created_at?: string | null
  draft?: boolean
  prerelease?: boolean
  html_url?: string | null
  url?: string | null
  upload_url?: string | null
}

export type PullRequestEntry = {
  raw: RestPullRequest
  normalized: PullRequest
  key: string
}

export type ReleaseNormalizer = (release: RestRelease) => Release
