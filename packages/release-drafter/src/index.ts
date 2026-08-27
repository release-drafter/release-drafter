import * as releaseDrafterCore from '@release-drafter/core'
import type {
  DraftReleaseOptions,
  DraftReleaseResult,
  Logger,
} from './types.js'

export type * from './types.js'

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
