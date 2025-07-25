const core = require('@actions/core')
const Table = require('cli-table3')
const { validateSchema } = require('./schema')
const { log } = require('./log')
const { runnerIsActions } = require('./utils')
const yaml = require('js-yaml') // Added for remote YAML parsing

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

/**
 * Loads a YAML config from another GitHub repo using the context's octokit instance.
 * @param {object} context - Probot or GitHub Actions context
 * @param {string} configName - repo:owner/repo/path/to/file.yml@ref
 * @returns {object} Parsed config object
 * @throws {Error} on invalid format, fetch, or parse failure
 */
async function loadRemoteConfig(context, configName) {
  const match = configName.match(/^repo:([^/]+)\/([^/]+)\/(.+?)(?:@(.+))?$/)
  if (!match) {
    throw new Error(`Invalid remote config format: ${configName}`)
  }
  const [, owner, repo, path, ref] = match
  const { data } = await context.octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  })
  const content = Buffer.from(data.content, 'base64').toString('utf8')
  return yaml.load(content)
}

/**
 * Loads config from local .github directory or from another GitHub repo if configName starts with 'repo:'.
 * Remote format: repo:owner/repo/path/to/file.yml@ref (ref is optional, defaults to default branch)
 */
async function getConfig({ context, configName }) {
  try {
    if (configName && configName.startsWith('repo:')) {
      const repoConfig = await loadRemoteConfig(context, configName)
      const config = validateSchema(context, repoConfig)
      return config
    }

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

exports.getConfig = getConfig
