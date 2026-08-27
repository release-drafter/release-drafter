import type { ForgeAdapter, PullRequestReader } from '@release-drafter/core'
import {
  createGiteaCompatibleRestProfile,
  createGitHubCompatibleRestAdapter,
  type RestAdapterOptions,
} from '@release-drafter/rest-adapter'
export const GITEA_ADAPTER_PACKAGE_NAME =
  '@release-drafter/gitea-adapter' as const

/** Explicit Gitea REST protocol profile. */
export const giteaProfile = createGiteaCompatibleRestProfile('normalize')

export class GiteaAdapter implements ForgeAdapter, PullRequestReader {
  readonly capabilities = giteaProfile.capabilities
  private readonly adapter: ForgeAdapter & PullRequestReader

  constructor(options: RestAdapterOptions) {
    this.adapter = createGitHubCompatibleRestAdapter(giteaProfile, options)
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
  getPullRequest: PullRequestReader['getPullRequest'] = (params) =>
    this.adapter.getPullRequest(params)
}
