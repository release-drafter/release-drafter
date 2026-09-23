import type {
  ChangeSet,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeCapabilities,
  GetPullRequestRequest,
  ListReleasesRequest,
  PullRequestValidationData,
  Release,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
  UploadReleaseAssetRequest,
} from './types.ts'

export type { Repository } from './types.ts'

export interface Logger {
  debug(message: string): void
  info(message: string): void
  warning(error: string | Error): void
  error(error: string | Error): void
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warning() {},
  error() {},
}

export interface ForgeAdapter {
  readonly capabilities: ForgeCapabilities
  listReleases(params: ListReleasesRequest): Promise<Release[]>
  findChanges(params: FindChangesRequest): Promise<ChangeSet>
  resolveCommitish(params: ResolveCommitishRequest): Promise<string>
  createRelease(params: CreateReleaseRequest): Promise<Release>
  updateRelease(params: UpdateReleaseRequest): Promise<Release>
  /**
   * Uploads a file to an existing release as a release asset.
   *
   * Adapters for forges without release assets omit this method.
   */
  uploadReleaseAsset?(params: UploadReleaseAssetRequest): Promise<void>
}

export interface PullRequestReader {
  getPullRequest(
    params: GetPullRequestRequest,
  ): Promise<PullRequestValidationData>
}
