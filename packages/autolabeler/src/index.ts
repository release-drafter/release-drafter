export const AUTOLABELER_PACKAGE_NAME = '@release-drafter/autolabeler' as const

export { type Config, configSchema } from './config/config.schema.ts'
export {
  type ParsedConfig,
  parseConfig,
} from './config/parse-config.ts'
export { parseConfigFile } from './config/parse-config-file.ts'
export {
  type AutolabelMatch,
  matchLabels,
  type PullRequestFacts,
} from './match-labels.ts'
export { type Logger, noopLogger } from './util.ts'
