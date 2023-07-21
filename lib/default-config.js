const { SORT_BY, SORT_DIRECTIONS } = require('./sort-pull-requests')

const DEFAULT_CONFIG = Object.freeze({
  'name-template': '',
  'tag-template': '',
  'tag-prefix': '',
  'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
  'change-title-escapes': '',
  'no-changes-template': `* No changes`,
  'version-template': `$MAJOR.$MINOR.$PATCH$PRERELEASE`,
  'version-resolver': {
    major: { labels: [] },
    minor: { labels: [] },
    patch: { labels: [] },
    default: 'patch',
  },
  categories: [],
  'exclude-labels': [],
  'include-labels': [],
  'include-paths': [],
  'exclude-contributors': [],
  'no-contributors-template': 'No contributors',
  replacers: [],
  autolabeler: [],
  'sort-by': SORT_BY.mergedAt,
  'sort-direction': SORT_DIRECTIONS.descending,
  prerelease: false,
  'prerelease-identifier': '',
  'include-pre-releases': false,
  latest: 'true',
  'filter-by-commitish': false,
  commitish: '',
  'category-template': `## $TITLE`,
  header: '',
  footer: '',
})

exports.DEFAULT_CONFIG = DEFAULT_CONFIG
