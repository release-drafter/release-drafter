import validRange from 'semver/ranges/valid.js'
import { type Logger, stringToRegex } from '#src/common/index.ts'
import { parseCategories } from './parse-categories.ts'
import type { Config } from './schemas/config.schema.ts'
import type { CommonConfig } from './schemas/index.ts'

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

/**
 * Similar to Config, but with input values merged in and defaults applied.
 *
 * @see mergeInputAndConfig
 */
export type ParsedConfig = ReturnType<typeof mergeInputAndConfig>

/**
 * Returns a copy of `config`, updated with values from `input`.
 *
 * Also performs some validation.
 *
 * Input takes precedence, because it's more easy to change at runtime
 */
export const mergeInputAndConfig = (params: {
  config: Config
  input: CommonConfig
  logger: Logger
  ref?: string
}) => {
  const { config: originalConfig, input } = params
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

  applyOverrides(config, input, params.logger)

  const { commitish, latest, prerelease } = getParsedDefaults(
    config,
    params.ref,
  )
  const replacers = getTransformedReplacers(config, params.logger)
  const categories = getTransformedCategories(
    config,
    deprecatedCategoryConfig,
    params.logger,
  )

  // Build parsed config object - alters original type
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
  if (typeof inputValue !== 'boolean') {
    return
  }

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
  if (!inputValue) {
    return
  }

  const configValue = config[key]
  if (configValue && configValue !== inputValue) {
    logger.info(
      `Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`,
    )
  }

  config[key] = inputValue
}

const getParsedDefaults = (config: MutableConfig, ref?: string) => ({
  commitish: config.commitish || ref || '',
  latest: typeof config.latest !== 'boolean' ? true : config.latest,
  prerelease:
    typeof config.prerelease !== 'boolean' ? false : config.prerelease,
})

const getTransformedReplacers = (config: MutableConfig, logger: Logger) =>
  config.replacers
    .map((r) => {
      try {
        return { ...r, search: stringToRegex(r.search) }
      } catch {
        logger.warning(`Bad replacer regex: '${r.search}'`)
        return false
      }
    })
    .filter((r) => !!r)

const getTransformedCategories = (
  config: Pick<MutableConfig, 'categories'>,
  deprecatedCategoryConfig: DeprecatedCategoryConfig,
  logger: Logger,
) => parseCategories(config, deprecatedCategoryConfig, logger)

const validateParsedConfig = (parsedConfig: ParsedConfig) => {
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)",
    )
  }
  const changelogCategoriesMissingTitle = parsedConfig.categories.filter(
    (category) => category.type === 'changelog' && !category.title,
  )
  if (changelogCategoriesMissingTitle.length > 0) {
    throw new Error(
      "Every 'type: \"changelog\"' category must define a non-empty 'title'.",
    )
  }
  const uncategorizedChangelogCategories = parsedConfig.categories.filter(
    (category) => category.type === 'changelog' && category.when.length === 0,
  )
  if (uncategorizedChangelogCategories.length > 1) {
    throw new Error(
      "Multiple 'type: \"changelog\"' categories detected with no 'when' condition. Only one such category is supported for uncategorized changes.",
    )
  }
  if (
    parsedConfig['filter-by-range'] &&
    !validRange(parsedConfig['filter-by-range'])
  ) {
    throw new Error(
      `'filter-by-range' value "${parsedConfig['filter-by-range']}" could not be parsed as a valid semver range.`,
    )
  }
}
