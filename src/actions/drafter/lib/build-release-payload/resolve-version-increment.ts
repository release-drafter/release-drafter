import * as core from '@actions/core'
import { resolveVersionKeyIncrement as resolveCoreVersionKeyIncrement } from '@release-drafter/core'
import type { ReleaseType } from 'semver'
import type { ParsedConfig } from '../../config/index.ts'
import { toCorePullRequest } from '../core-compat.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

export const resolveVersionKeyIncrement = (params: {
  pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests']
  config: Pick<
    ParsedConfig,
    'categories' | 'prerelease' | 'prerelease-identifier'
  >
}): ReleaseType =>
  resolveCoreVersionKeyIncrement({
    pullRequests: params.pullRequests.map(toCorePullRequest),
    config: params.config,
    logger: core,
  })
