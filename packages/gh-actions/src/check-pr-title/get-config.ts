import { context } from '@actions/github'
import type { Config } from '@release-drafter/core'
import { getReleaseDrafterConfig } from '../common/config/get-release-drafter-config.ts'

export const getConfig = async (
  configName: string,
  token?: string,
): Promise<Config> => getReleaseDrafterConfig(configName, context, token)
