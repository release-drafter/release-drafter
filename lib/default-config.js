const { SORT_BY, SORT_DIRECTIONS } = require('./sort-pull-requests')

const DEFAULT_CONFIG = Object.freeze({
  'name-template': '',
  'tag-template': '',
  'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
  'no-changes-template': `* No changes`,
  'version-template': `$MAJOR.$MINOR.$PATCH`,
  categories: [],
  'exclude-labels': [],
  replacers: [],
  'sort-by': SORT_BY.mergedAt,
  'sort-direction': SORT_DIRECTIONS.descending,
  prerelease: false
})

module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG
