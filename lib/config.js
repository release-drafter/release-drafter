const {
  SORT_DIRECTIONS,
  validateSortDirection
} = require('./sort-pull-requests')
const { validateReplacers } = require('./template')

const CONFIG_NAME = 'release-drafter.yml'

const DEFAULT_CONFIG = Object.freeze({
  'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
  'no-changes-template': `* No changes`,
  'version-template': `$MAJOR.$MINOR.$PATCH`,
  categories: [],
  'exclude-labels': [],
  replacers: [],
  'sort-direction': SORT_DIRECTIONS.descending,
  prerelease: false
})

module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG

module.exports.getConfig = async function getConfig({
  app,
  context,
  getConfig: fetchConfig
}) {
  const defaults = {
    ...DEFAULT_CONFIG,
    branches: context.payload.repository.default_branch
  }

  const config = await fetchConfig(context, CONFIG_NAME, defaults)

  try {
    config.replacers = validateReplacers({
      app,
      context,
      replacers: config.replacers
    })
  } catch (error) {
    config.replacers = []
  }

  config['sort-direction'] = validateSortDirection(config['sort-direction'])

  return config
}
