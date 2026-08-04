import type { ForgeAdapter } from '@release-drafter/core'
import {
  createGiteaCompatibleRestProfile,
  createGitHubCompatibleRestAdapter,
  type RestAdapterOptions,
} from '@release-drafter/rest-adapter'

export const FORGEJO_ADAPTER_PACKAGE_NAME =
  '@release-drafter/forgejo-adapter' as const

/** Forgejo currently implements the shared Gitea-compatible REST profile. */
export const forgejoProfile = createGiteaCompatibleRestProfile()

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
