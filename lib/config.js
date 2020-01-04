const { validateSchema } = require('./schema')
const { DEFAULT_CONFIG } = require('./default-config')
const log = require('./log')

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
    return null
  }
}
