const core = require('@actions/core')
const Table = require('cli-table3')
const { validateSchema } = require('./schema')
const { log } = require('./log')
const { runnerIsActions } = require('./utils')

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

async function getConfig({ context, configName }) {
  const name = configName || DEFAULT_CONFIG_NAME

  try {
    const repoConfig = await context.config(name, null)
    if (repoConfig == null) {
      const { owner } = context.repo()

      log(context, 'OWNER')
      log(context, owner)

      const orgConfig = await context.octokit.repos.getContent({
        owner: owner,
        repo: '.github',
        path: name,
      })

      log(context, 'orgConfig')
      log(context, orgConfig)

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
          name +
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

exports.getConfig = getConfig
