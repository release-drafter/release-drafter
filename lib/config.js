const core = require('@actions/core')
const { validateSchema } = require('./schema')
const log = require('./log')
const { runnerIsActions } = require('./utils')
const Table = require('cli-table3')

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

module.exports.getConfig = async function getConfig({ context, configName }) {
  try {
    const repoConfig = await context.config(
      configName || DEFAULT_CONFIG_NAME,
      null
    )
    if (repoConfig == null) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        'Configuration file .github/' +
          (configName || DEFAULT_CONFIG_NAME) +
          ' is not found. The configuration file must reside in your default branch.'
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
  error.details.forEach(({ path, message }) => {
    const prettyPath = path
      .map((pathPart) =>
        Number.isInteger(pathPart) ? `[${pathPart}]` : pathPart
      )
      .join('.')
    table.push([prettyPath, message])
  })
  return table.toString()
}
