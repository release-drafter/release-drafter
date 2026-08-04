import type { ForgeAdapter, Repository } from '@release-drafter/core'
import {
  createGiteaCompatibleRestProfile,
  createGitHubCompatibleRestAdapter,
  type GitHubCompatibleRestAdapterRuntime,
  type RestAdapterOptions,
} from '@release-drafter/rest-adapter'

export const FORGEJO_ADAPTER_PACKAGE_NAME =
  '@release-drafter/forgejo-adapter' as const

/** Forgejo implements the shared REST profile while accepting full refs. */
export const forgejoProfile = createGiteaCompatibleRestProfile('preserve')

export class ForgejoAdapter implements ForgeAdapter {
  readonly capabilities = forgejoProfile.capabilities
  private readonly adapter: GitHubCompatibleRestAdapterRuntime

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
  getDefaultBranch = (repository: Repository) =>
    this.adapter.getDefaultBranch(repository)
  getRepositoryConfig: GitHubCompatibleRestAdapterRuntime['getRepositoryConfig'] =
    (options) => this.adapter.getRepositoryConfig(options)
}
