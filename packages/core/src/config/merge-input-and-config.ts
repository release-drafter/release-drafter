import { normalizeRange } from 'verkit'
import type { Logger } from '../ports.ts'
import { stringToRegex } from '../string-to-regex.ts'
import type { ParsedConfig } from '../types.ts'
import type { CommonConfig } from './common-config.schema.ts'
import type { Config } from './config.schema.ts'
import { parseCategories } from './parse-categories.ts'

type DeprecatedCategoryConfig = Pick<
  Config,
  | 'exclude-labels'
  | 'include-labels'
  | 'include-paths'
  | 'exclude-paths'
  | 'version-resolver'
>
type MutableConfig = Omit<
  ReturnType<typeof structuredClone<Config>>,
  keyof DeprecatedCategoryConfig
>
type SharedConfigKey = keyof CommonConfig & keyof MutableConfig
type SharedKeysByValue<Value> = {
  [Key in SharedConfigKey]: Exclude<CommonConfig[Key], undefined> extends Value
    ? Exclude<MutableConfig[Key], undefined> extends Value
      ? Key
      : never
    : never
}[SharedConfigKey]
type SharedStringKey = SharedKeysByValue<string>
type SharedBooleanKey = SharedKeysByValue<boolean>

export const mergeInputAndConfig = (params: {
  config: Config
  input: CommonConfig
  defaultCommitish?: string
  logger: Logger
}): ParsedConfig => {
  const { config: originalConfig, input, defaultCommitish, logger } = params
  const {
    'exclude-labels': excludeLabels,
    'include-labels': includeLabels,
    'include-paths': includePaths,
    'exclude-paths': excludePaths,
    'version-resolver': versionResolver,
    ...config
  } = structuredClone(originalConfig)
  const deprecatedCategoryConfig: DeprecatedCategoryConfig = {
    'exclude-labels': excludeLabels,
    'include-labels': includeLabels,
    'include-paths': includePaths,
    'exclude-paths': excludePaths,
    'version-resolver': versionResolver,
  }

  applyOverrides(config, input, logger)
  const commitish = config.commitish || defaultCommitish || ''
  const latest = typeof config.latest !== 'boolean' ? true : config.latest
  const prerelease =
    typeof config.prerelease !== 'boolean' ? false : config.prerelease
  const replacers = config.replacers
    .map((replacer) => {
      try {
        return { ...replacer, search: stringToRegex(replacer.search) }
      } catch {
        logger.warning(`Bad replacer regex: '${replacer.search}'`)
        return false
      }
    })
    .filter((replacer) => !!replacer)
  const categories = parseCategories(config, deprecatedCategoryConfig, logger)
  const parsedConfig = {
    ...config,
    commitish,
    latest,
    prerelease,
    replacers,
    categories,
  }

  validateParsedConfig(parsedConfig)
  return parsedConfig
}

const applyOverrides = (
  config: MutableConfig,
  input: CommonConfig,
  logger: Logger,
) => {
  applyStringOverride(config, input, 'commitish', logger)
  applyStringOverride(config, input, 'header', logger)
  applyStringOverride(config, input, 'footer', logger)
  applyStringOverride(config, input, 'prerelease-identifier', logger)
  applyBooleanOverride(config, input, 'prerelease', logger)
  applyBooleanOverride(config, input, 'include-pre-releases', logger)
  applyBooleanOverride(config, input, 'latest', logger)
  applyStringOverride(config, input, 'filter-by-range', logger)
  applyReleaseModeOverrides(config, input, logger)
}

const applyReleaseModeOverrides = (
  config: MutableConfig,
  input: CommonConfig,
  logger: Logger,
) => {
  if (config.latest && config.prerelease) {
    logger.warning(
      "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.",
    )
    config.latest = false
  }

  const hasInputPrerelease = typeof input.prerelease === 'boolean'
  const hasInputPrereleaseIdentifier = !!input['prerelease-identifier']
  if (
    config['prerelease-identifier'] &&
    !config.prerelease &&
    (!hasInputPrerelease || hasInputPrereleaseIdentifier)
  ) {
    logger.warning(
      `You specified a 'prerelease-identifier' (${config['prerelease-identifier']}), but 'prerelease' is set to false. Switching to true.`,
    )
    config.prerelease = true
  }
}

const applyBooleanOverride = (
  config: MutableConfig,
  input: CommonConfig,
  key: SharedBooleanKey,
  logger: Logger,
) => {
  const inputValue = input[key]
  if (typeof inputValue !== 'boolean') return
  const configValue = config[key]
  if (typeof configValue === 'boolean' && configValue !== inputValue) {
    logger.info(
      `Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`,
    )
  }
  config[key] = inputValue
}

const applyStringOverride = (
  config: MutableConfig,
  input: CommonConfig,
  key: SharedStringKey,
  logger: Logger,
) => {
  const inputValue = input[key]
  if (!inputValue) return
  const configValue = config[key]
  if (configValue && configValue !== inputValue) {
    logger.info(
      `Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`,
    )
  }
  config[key] = inputValue
}

const validateParsedConfig = (parsedConfig: {
  commitish: string
  categories: ReturnType<typeof parseCategories>
  'filter-by-range'?: string
}) => {
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)",
    )
  }
  if (
    parsedConfig.categories.some(
      (category) => category.type === 'changelog' && !category.title,
    )
  ) {
    throw new Error(
      "Every 'type: \"changelog\"' category must define a non-empty 'title'.",
    )
  }
  if (
    parsedConfig.categories.filter(
      (category) => category.type === 'changelog' && category.when.length === 0,
    ).length > 1
  ) {
    throw new Error(
      "Multiple 'type: \"changelog\"' categories detected with no 'when' condition. Only one such category is supported for uncategorized changes.",
    )
  }
  if (
    parsedConfig['filter-by-range'] &&
    !normalizeRange(parsedConfig['filter-by-range'])
  ) {
    throw new Error(
      `'filter-by-range' value "${parsedConfig['filter-by-range']}" could not be parsed as a valid semver range.`,
    )
  }
}
