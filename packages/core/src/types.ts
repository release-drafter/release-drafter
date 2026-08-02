import type {
  CategoryConfig,
  ChangeConditionConfig,
  Config,
} from './config/config.schema.ts'

export type ReleaseAuthor = {
  login: string
  url?: string
  type?: 'Bot' | 'User' | string
}

export type PullRequest = {
  number: number
  title: string
  body?: string | null
  url?: string
  mergedAt?: string | null
  baseRefName?: string
  headRefName?: string
  baseRepository?: string | null
  author?: ReleaseAuthor | null
  labels?: string[]
  changedFiles?: string[]
  mergeCommitOid?: string | null
}

export type CommitAuthor = {
  name?: string | null
  login?: string | null
}

export type Commit = {
  oid: string
  author?: CommitAuthor | null
  authors?: (CommitAuthor | null)[] | null
  associatedPullRequests?:
    | (Pick<PullRequest, 'number' | 'baseRepository'> | null)[]
    | null
}

export type Release = {
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

export type ChangeSet = {
  commits: Commit[]
  pullRequests: PullRequest[]
  newContributorLogins: ReadonlySet<string>
}

export type PreviousReleases = {
  draftRelease?: Release
  lastRelease?: Release
}

export type PreviousReleaseConfig = Pick<
  Config,
  | 'commitish'
  | 'filter-by-commitish'
  | 'tag-prefix'
  | 'prerelease'
  | 'include-pre-releases'
  | 'filter-by-range'
>

export type Repository = {
  owner: string
  name: string
  serverUrl: string
}

export type ForgeCapabilities = {
  draftReleases: boolean
}

export type RefComparison = {
  baseRef: string
  headRef: string
}

export type PullRequestFieldSelection = {
  body: boolean
  url: boolean
  baseRefName: boolean
  headRefName: boolean
}

export type FindChangesRequest = {
  repository: Repository
  comparison: RefComparison
  pullRequestFields: PullRequestFieldSelection
  pullRequestLimit: number
  historyLimit: number
  includeChangedFiles: boolean
  includeNewContributors: boolean
}

export type ListReleasesRequest = {
  repository: Repository
}

export type ResolveCommitishRequest = {
  repository: Repository
  commitish: string
}

export type CreateReleaseRequest = {
  repository: Repository
  payload: ReleasePayload
}

export type UpdateReleaseRequest = {
  repository: Repository
  release: Release
  payload: ReleasePayload
}

export type ParsedChangeCondition = Omit<
  ChangeConditionConfig,
  'path' | 'label' | 'conventional'
> & {
  labels: string[]
  paths: string[]
  'labels-mode': NonNullable<ChangeConditionConfig['labels-mode']>
  'paths-mode': NonNullable<ChangeConditionConfig['paths-mode']>
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
      'collapse-after': NonNullable<CategoryConfig['collapse-after']>
      'semver-increment': NonNullable<CategoryConfig['semver-increment']>
      exclusive: boolean
      title?: string
    }
  | {
      type: 'version-resolver'
      when: ParsedChangeCondition[]
      'semver-increment': NonNullable<CategoryConfig['semver-increment']>
      exclusive: boolean
    }
  | {
      type: 'pre-include' | 'pre-exclude'
      when: ParsedChangeCondition[]
    }

export type ParsedReplacer = Omit<Config['replacers'][number], 'search'> & {
  search: RegExp
}

export type ParsedConfig = Omit<
  Config,
  | 'exclude-labels'
  | 'include-labels'
  | 'include-paths'
  | 'exclude-paths'
  | 'version-resolver'
  | 'commitish'
  | 'latest'
  | 'prerelease'
  | 'replacers'
  | 'categories'
> & {
  commitish: string
  latest: boolean
  prerelease: boolean
  replacers: ParsedReplacer[]
  categories: ParsedCategory[]
}

export type ReleaseInput = {
  name?: string
  tag?: string
  version?: string
  publish: boolean
  dryRun?: boolean
}

export type ReleasePayload = {
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

export type DraftReleaseResult = {
  plan: ReleasePlan
  release?: Release
  releasePayload: ReleasePayload
}
