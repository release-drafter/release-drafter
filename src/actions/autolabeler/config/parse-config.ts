import * as core from '@actions/core'
import {
  type Config,
  parseConfig as parseCoreConfig,
} from '@release-drafter/autolabeler'

export const parseConfig = ({ config }: { config: Config }) =>
  parseCoreConfig({ config, logger: core })

export type ParsedConfig = ReturnType<typeof parseConfig>
