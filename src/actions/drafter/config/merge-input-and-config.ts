import * as core from '@actions/core'
import { Config } from './schemas/config.schema'
import { CommonConfig } from './schemas'
import { context } from '@actions/github'
import { stringToRegex } from 'src/common'

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

  // Handle overrides
  if (input.commitish) {
    if (config.commitish && config.commitish !== input.commitish) {
      core.info(
        `Input's commitish "${input.commitish}" overrides config's commitish "${config.commitish}"`
      )
    }
    config.commitish = input.commitish
  }
  if (input.header) {
    if (config.header && config.header !== input.header) {
      core.info(
        `Input's header "${input.header}" overrides config's header "${config.header}"`
      )
    }
    config.header = input.header
  }
  if (input.footer) {
    if (config.footer && config.footer !== input.footer) {
      core.info(
        `Input's footer "${input.footer}" overrides config's footer "${config.footer}"`
      )
    }
    config.footer = input.footer
  }
  if (input['prerelease-identifier']) {
    if (
      config['prerelease-identifier'] &&
      config['prerelease-identifier'] !== input['prerelease-identifier']
    ) {
      core.info(
        `Input's prerelease-identifier "${input['prerelease-identifier']}" overrides config's prerelease-identifier "${config['prerelease-identifier']}"`
      )
    }
    config['prerelease-identifier'] = input['prerelease-identifier']
  }
  if (typeof input.prerelease === 'boolean') {
    if (
      typeof config.prerelease === 'boolean' &&
      config.prerelease !== input.prerelease
    ) {
      core.info(
        `Input's prerelease "${input.prerelease}" overrides config's prerelease "${config.prerelease}"`
      )
    }
    config.prerelease = input.prerelease
  }
  if (typeof input['include-pre-releases'] === 'boolean') {
    if (
      typeof config['include-pre-releases'] === 'boolean' &&
      config['include-pre-releases'] !== input['include-pre-releases']
    ) {
      core.info(
        `Input's include-pre-releases "${input['include-pre-releases']}" overrides config's include-pre-releases "${config['include-pre-releases']}"`
      )
    }
    config['include-pre-releases'] = input['include-pre-releases']
  }
  if (typeof input.latest === 'boolean') {
    if (typeof config.latest === 'boolean' && config.latest !== input.latest) {
      core.info(
        `Input's latest "${input.latest}" overrides config's latest "${config.latest}"`
      )
    }
    config.latest = input.latest
  }
  if (config.latest && config.prerelease) {
    core.warning(
      "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release."
    )
    config.latest = false
  }
  if (config['prerelease-identifier'] && !config['include-pre-releases']) {
    core.warning(
      `You have specified a 'prerelease-identifier' (${config['prerelease-identifier']}), but 'include-pre-releases' is set to false. Switching to true.`
    )
    config['include-pre-releases'] = true
  }

  // Write defaults
  const commitish =
    config.commitish || context.ref || (context.payload.ref as string)
  const latest = typeof config.latest !== 'boolean' ? true : config.latest
  const prerelease =
    typeof config.prerelease !== 'boolean' ? false : config.prerelease

  // Apply some transformations
  const replacers = config.replacers
    .map((r) => {
      // convert 'search' to regex and remove invalid entries
      try {
        return { ...r, search: stringToRegex(r.search) }
      } catch {
        core.warning(`Bad replacer regex: '${r.search}'`)
        return false
      }
    })
    .filter((r) => !!r)
  const categories = config.categories.map((cat) => {
    const { label, ..._cat } = cat
    _cat.labels = [...cat.labels, label].filter(Boolean) as string[]
    return _cat
  })

  // Build parsed config object - alters original type
  const parsedConfig = {
    ...config,
    commitish,
    latest,
    prerelease,
    replacers,
    categories
  }

  // Throw some more validation errors
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)"
    )
  }
  if (
    parsedConfig.categories.filter((category) => category.labels.length === 0)
      .length > 1
  ) {
    throw new Error(
      'Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests.'
    )
  }

  return parsedConfig
}

/**
 * Similar to Config, but with input values merged in and defaults applied.
 *
 * @see mergeInputAndConfig
 */
export type ParsedConfig = ReturnType<typeof mergeInputAndConfig>
