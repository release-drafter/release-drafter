const core = require('@actions/core')
const { validateSchema } = require('./schema')
const { DEFAULT_CONFIG } = require('./default-config')
const log = require('./log')
const { runnerIsActions } = require('./utils')
const Table = require('cli-table')

const CONFIG_NAME = 'release-drafter.yml'

module.exports.getConfig = async function getConfig({
  app,
  context,
  getConfig: fetchConfig
}) {
  try {
    const repoConfig = await fetchConfig(context, CONFIG_NAME, DEFAULT_CONFIG)

    const config = validateSchema(app, context, repoConfig)

    return config
  } catch (error) {
    log({ app, context, error, message: 'Invalid config file' })

    if (error.isJoi) {
      const table = new Table({ head: ['Property', 'Error'] })
      error.details.forEach(({ path, message }) =>
        table.push([path.join('.'), message])
      )
      log({
        app,
        context,
        message: 'Config validation errors\n' + table.toString()
      })
    }

    if (runnerIsActions()) {
      core.setFailed('Invalid config file')
    }
    return null
  }
}
