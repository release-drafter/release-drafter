const { validateSchema } = require('./schema')
const { DEFAULT_CONFIG } = require('./default-config')
const log = require('./log')

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'

module.exports.getConfig = async function getConfig({
  app,
  context,
  configName,
  getConfig: fetchConfig
}) {
  try {
    const repoConfig = await fetchConfig(
      context,
      configName || DEFAULT_CONFIG_NAME,
      DEFAULT_CONFIG
    )

    const config = validateSchema(app, context, repoConfig)

    return config
  } catch (error) {
    log({ app, context, error, message: 'Invalid config file' })
    return null
  }
}
