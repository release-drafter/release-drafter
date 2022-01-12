import core from '@actions/core'
import Table from 'cli-table3'
import { validateSchema } from './schema'
import { log } from './log'
import { runnerIsActions } from './utils'

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

export async function getConfig({ context, configName }) {
  try {
    const repoConfig = await context.config(
      configName || DEFAULT_CONFIG_NAME,
      null
    )
    if (repoConfig == null) {
      const name = configName || DEFAULT_CONFIG_NAME
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        `Configuration file .github/${name} is not found. The configuration file must reside in your default branch.`
      )
    }

    const config = validateSchema(context, repoConfig)

    return config
  } catch (error) {
    log({ context, error, message: 'Invalid config file' })

    if (error.isJoi) {
      log({
        context,
        message:
          'Config validation errors, please fix the following issues in ' +
          (configName || DEFAULT_CONFIG_NAME) +
          ':\n' +
          joiValidationErrorsAsTable(error),
      })
    }

    if (runnerIsActions()) {
      core.setFailed('Invalid config file')
    }
    return null
  }
}

function joiValidationErrorsAsTable(error) {
  const table = new Table({ head: ['Property', 'Error'] })
  for (const { path, message } of error.details) {
    const prettyPath = path
      .map((pathPart) =>
        Number.isInteger(pathPart) ? `[${pathPart}]` : pathPart
      )
      .join('.')
    table.push([prettyPath, message])
  }
  return table.toString()
}
