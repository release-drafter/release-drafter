import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  type CommonConfig,
  type Config,
  mergeInputAndConfig as mergeCoreInputAndConfig,
} from '@release-drafter/core'

export const mergeInputAndConfig = (params: {
  config: Config
  input: CommonConfig
}) =>
  mergeCoreInputAndConfig({
    ...params,
    defaultCommitish: context.ref || (context.payload.ref as string),
    logger: core,
  })

export type ParsedConfig = ReturnType<typeof mergeInputAndConfig>
