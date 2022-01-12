import { SORT_BY, SORT_DIRECTIONS } from './sort-pull-requests'

export const DEFAULT_CONFIG = Object.freeze({
  'name-template': '',
  'tag-template': '',
  'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
  'change-title-escapes': '',
  'no-changes-template': `* No changes`,
  'version-template': `$MAJOR.$MINOR.$PATCH`,
  'version-resolver': {
    major: { labels: [] },
    minor: { labels: [] },
    patch: { labels: [] },
    default: 'patch',
  },
  categories: [],
  'exclude-labels': [],
  'include-labels': [],
  'exclude-contributors': [],
  'no-contributors-template': 'No contributors',
  replacers: [],
  autolabeler: [],
  'sort-by': SORT_BY.mergedAt,
  'sort-direction': SORT_DIRECTIONS.descending,
  prerelease: false,
  'filter-by-commitish': false,
  commitish: '',
  'category-template': `## $TITLE`,
})
