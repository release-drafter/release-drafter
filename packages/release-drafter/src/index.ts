import { open, realpath, stat } from 'node:fs/promises'
import * as releaseDrafterCore from '@release-drafter/core'
import { ForgejoAdapter } from '@release-drafter/forgejo-adapter'
import { GiteaAdapter } from '@release-drafter/gitea-adapter'
import { GitHubAdapter } from '@release-drafter/github-adapter'
import { GitLabAdapter } from '@release-drafter/gitlab-adapter'
import type {
  BundledForgeAdapter,
  CreateForgeAdapterOptions,
  DraftReleaseConfig,
  DraftReleaseOptions,
  DraftReleaseResult,
  ForgeName,
  LoadConfigOptions,
  Logger,
} from './types.js'

export type * from './types.js'

/** Constructs a bundled forge adapter from a stable structural option shape. */
export const createForgeAdapter = (
  options: CreateForgeAdapterOptions,
): BundledForgeAdapter => {
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

const defaultLogger: Logger = {
  debug() {},
  info() {},
  warning() {},
  error() {},
}

/** Loads, validates, and normalizes standard configuration using the selected forge. */
export const loadConfig = async (
  options: LoadConfigOptions,
): Promise<DraftReleaseConfig> => {
  const logger = options.logger ?? defaultLogger
  const ref =
    options.ref ?? (await options.adapter.getDefaultBranch(options.repository))
  const config = await releaseDrafterCore.loadConfig({
    target: options.target ?? 'release-drafter.yml',
    repository: options.repository,
    ref,
    cwd: options.cwd ?? process.cwd(),
    reader: options.adapter,
    logger,
    readLocalFile: releaseDrafterCore.createLocalConfigFileReader({
      open,
      realpath,
      stat,
    }),
  })
  return releaseDrafterCore.mergeInputAndConfig({
    config,
    input: options.overrides ?? {},
    defaultCommitish: ref,
    logger,
  })
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
    labels: result.labels,
  }
}

/** Package identity for the public Release Drafter facade. */
export const RELEASE_DRAFTER_PACKAGE_NAME = 'release-drafter' as const
