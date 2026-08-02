import type {
  ChangeSet,
  CreateReleaseRequest,
  FindChangesRequest,
  ForgeCapabilities,
  ListReleasesRequest,
  Release,
  ResolveCommitishRequest,
  UpdateReleaseRequest,
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
}
