import * as core from '@actions/core'
import isBoolean from 'lodash/isBoolean.js'
import { Config } from './schemas/config.schema'
import { CommonConfig } from './schemas'
import { context } from '@actions/github'

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

  if (isBoolean(input.prerelease)) {
    if (
      isBoolean(config.prerelease) &&
      config.prerelease !== input.prerelease
    ) {
      core.info(
        `Input's prerelease "${input.prerelease}" overrides config's prerelease "${config.prerelease}"`
      )
    }
    config.prerelease = input.prerelease
  }

  if (isBoolean(input.latest)) {
    if (isBoolean(config.latest) && config.latest !== input.latest) {
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
  if (!config.commitish) config.commitish = context.ref || context.payload.ref
  if (!config.latest) config.latest = true
  if (!config.prerelease) config.prerelease = false

  // Throw some more validation errors
  if (!config.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)"
    )
  }

  return config as Config &
    Required<Pick<Config, 'latest' | 'prerelease' | 'commitish'>>
}

/**
 * Similar to Config, but with input values merged in and defaults applied.
 *
 * @see mergeInputAndConfig
 */
export type ParsedConfig = ReturnType<typeof mergeInputAndConfig>
