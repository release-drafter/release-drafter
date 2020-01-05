const core = require('@actions/core')
const { validateSchema } = require('./schema')
const { DEFAULT_CONFIG } = require('./default-config')
const log = require('./log')
const { runnerIsActions } = require('./utils')

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
    if (runnerIsActions()) {
      core.setFailed('Invalid config file')
    }
    return null
  }
}
