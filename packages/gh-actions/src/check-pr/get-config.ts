import { context } from '@actions/github'
import type { Config } from '@release-drafter/core'
import { getReleaseDrafterConfig } from '../common/config/get-release-drafter-config.ts'

export const getConfig = async (
  configName: string,
  token?: string,
  ref = context.ref,
): Promise<Config> =>
  getReleaseDrafterConfig(configName, { ref, repo: context.repo }, token)
