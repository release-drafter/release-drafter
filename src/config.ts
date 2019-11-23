import fetchConfig from 'probot-config'
import { Config, DefaultParams } from './types'
import { SORT_DIRECTIONS, validateSortDirection } from './sort-pull-requests'
import { validateReplacers } from './template'

const configName = 'release-drafter.yml'

export async function getConfig({
  app,
  context
}: DefaultParams): Promise<Config> {
  const defaults = {
    branches: context.payload.repository.default_branch,
    'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
    'no-changes-template': `* No changes`,
    'version-template': `$MAJOR.$MINOR.$PATCH`,
    categories: [],
    'exclude-labels': [],
    replacers: [],
    'sort-direction': SORT_DIRECTIONS.descending
  }

  const config = Object.assign(
    defaults,
    (await fetchConfig<Config>(context, configName)) || {}
  )

  config.replacers = validateReplacers({
    app,
    context,
    replacers: config.replacers
  })

  config['sort-direction'] = validateSortDirection(config['sort-direction'])

  return config
}
