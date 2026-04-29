import * as core from '@actions/core'
import { context } from '@actions/github'
import validRange from 'semver/ranges/valid'
import { stringToRegex } from 'src/common'
import type { CommonConfig } from './schemas'
import type { Config } from './schemas/config.schema'

type MutableConfig = ReturnType<typeof structuredClone<Config>>

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
}) => {
  const { config: originalConfig, input } = params

  const config = structuredClone(originalConfig)

  applyOverrides(config, input)

  const { commitish, latest, prerelease } = getParsedDefaults(config)
  const replacers = getTransformedReplacers(config)
  const categories = getTransformedCategories(config)

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

const applyOverrides = (config: MutableConfig, input: CommonConfig) => {
  applyStringOverride(config, input, 'commitish')
  applyStringOverride(config, input, 'header')
  applyStringOverride(config, input, 'footer')

  applyStringOverride(config, input, 'prerelease-identifier')

  applyBooleanOverride(config, input, 'prerelease')
  applyBooleanOverride(config, input, 'include-pre-releases')
  applyBooleanOverride(config, input, 'latest')
  applyStringOverride(config, input, 'filter-by-range')
  applyStringOverride(config, input, 'initial-commits-since')

  applyReleaseModeOverrides(config, input)
}

const applyReleaseModeOverrides = (
  config: MutableConfig,
  input: CommonConfig,
) => {
  if (config.latest && config.prerelease) {
    core.warning(
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
    core.warning(
      `You specified a 'prerelease-identifier' (${config['prerelease-identifier']}), but 'prerelease' is set to false. Switching to true.`,
    )
    config.prerelease = true
  }
}

const applyBooleanOverride = (
  config: MutableConfig,
  input: CommonConfig,
  key: SharedBooleanKey,
) => {
  const inputValue = input[key]
  if (typeof inputValue !== 'boolean') {
    return
  }

  const configValue = config[key]
  if (typeof configValue === 'boolean' && configValue !== inputValue) {
    core.info(
      `Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`,
    )
  }

  config[key] = inputValue
}

const applyStringOverride = (
  config: MutableConfig,
  input: CommonConfig,
  key: SharedStringKey,
) => {
  const inputValue = input[key]
  if (!inputValue) {
    return
  }

  const configValue = config[key]
  if (configValue && configValue !== inputValue) {
    core.info(
      `Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`,
    )
  }

  config[key] = inputValue
}

const getParsedDefaults = (config: MutableConfig) => ({
  commitish: config.commitish || context.ref || (context.payload.ref as string),
  latest: typeof config.latest !== 'boolean' ? true : config.latest,
  prerelease:
    typeof config.prerelease !== 'boolean' ? false : config.prerelease,
})

const getTransformedReplacers = (config: MutableConfig) =>
  config.replacers
    .map((r) => {
      try {
        return { ...r, search: stringToRegex(r.search) }
      } catch {
        core.warning(`Bad replacer regex: '${r.search}'`)
        return false
      }
    })
    .filter((r) => !!r)

const getTransformedCategories = (config: MutableConfig) =>
  config.categories.map((cat) => {
    const { label, ..._cat } = cat
    _cat.labels = [...cat.labels, label].filter(Boolean) as string[]
    return _cat
  })

const validateParsedConfig = (
  parsedConfig: ReturnType<typeof mergeInputAndConfig>,
) => {
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)",
    )
  }
  if (
    parsedConfig.categories.filter((category) => category.labels.length === 0)
      .length > 1
  ) {
    throw new Error(
      'Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests.',
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
