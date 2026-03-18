import type { Config } from './schemas/config.schema'

type Category = Pick<Config, 'categories'>['categories'][number]
type Condition = Exclude<Category['when'], unknown[]>

/**
 * Parses all categories from the config, normalizing conditions and
 * handling backward compatibility with deprecated fields.
 *
 * This function:
 * - Normalizes the `when` field to always be an array of conditions
 * - Merges deprecated `label`/`labels` fields into both:
 *   - `labels` array (for backward compatibility)
 *   - `when` conditions (for new implementation)
 * - Preserves all other category fields as-is
 *
 * Accepts both fully-typed and partial category objects for flexibility.
 *
 * @param categories - Categories from the raw config
 * @returns Array of fully parsed categories with normalized conditions
 */
export function parseCategories(
  categories: Pick<Config, 'categories'>,
  deprecatedConfig: Pick<
    Config,
    | 'exclude-labels'
    | 'include-labels'
    | 'include-paths'
    | 'exclude-paths'
    | 'version-resolver'
  >,
) {
  const _categories = structuredClone(categories.categories)

  const parsedCategories = _categories.map((cat) => {
    const {
      // Deprecated fields
      labels,
      label,

      when: _when,

      // Potentially removed, depends on type
      'collapse-after': collapseAfter,
      'semver-increment': semverIncrement,
      exclusive,
      title,

      // Rest
      ..._cat
    } = cat

    const deprecatedMappedToConditions: Condition[] = []

    // Handle deprecated label/labels fields
    // Merge label (singular) with labels (array)
    if (label || (labels && labels.length > 0)) {
      const mergedLabels = [
        ...(labels || []),
        ...(label ? [label] : []),
      ].filter(Boolean) as string[]

      if (mergedLabels.length > 0) {
        deprecatedMappedToConditions.push({
          labels: mergedLabels,
          'labels-mode': 'any',
          paths: [],
          'paths-mode': 'any',
        })
      }
    }

    // Handle `when` array
    let whenConditions: Condition[] = []
    if (_when && _when !== undefined) {
      // when can be a single condition or array of conditions
      whenConditions = Array.isArray(_when) ? _when : [_when]
    }

    const parsedWhenConditions = [
      ...whenConditions,
      ...deprecatedMappedToConditions,
    ].map((condition) => {
      const { path, label, ..._cond } = condition

      return {
        ..._cond,
        paths: [...(condition.paths || []), ...(path ? [path] : [])],
        labels: [...(condition.labels || []), ...(label ? [label] : [])],
      }
    })

    switch (_cat.type) {
      case 'changelog':
        return {
          type: 'changelog' as const,
          when: parsedWhenConditions,
          'collapse-after': collapseAfter,
          'semver-increment': semverIncrement,
          exclusive,
          title,
        }
      case 'version-resolver':
        return {
          type: 'version-resolver' as const,
          when: parsedWhenConditions,
          'semver-increment': semverIncrement,
          exclusive,
        }
      case 'pre-exclude':
      case 'pre-include':
        return {
          type: _cat.type,
          when: parsedWhenConditions,
        }
      default:
        throw new Error(`Unsupported category type: ${_cat.type}`)
    }
  })

  // Handle top_level deprecated configs
  if (
    (deprecatedConfig['exclude-labels'] &&
      deprecatedConfig['exclude-labels'].length > 0) ||
    (deprecatedConfig['exclude-paths'] &&
      deprecatedConfig['exclude-paths'].length > 0)
  ) {
    parsedCategories.push({
      type: 'pre-exclude',
      when: [
        {
          labels: deprecatedConfig['exclude-labels'] || [],
          'labels-mode': 'any',
          paths: deprecatedConfig['exclude-paths'] || [],
          'paths-mode': 'any',
        },
      ],
    })
  }
  if (
    (deprecatedConfig['include-labels'] &&
      deprecatedConfig['include-labels'].length > 0) ||
    (deprecatedConfig['include-paths'] &&
      deprecatedConfig['include-paths'].length > 0)
  ) {
    parsedCategories.push({
      type: 'pre-include',
      when: [
        {
          labels: deprecatedConfig['include-labels'] || [],
          'labels-mode': 'any',
          paths: deprecatedConfig['include-paths'] || [],
          'paths-mode': 'any',
        },
      ],
    })
  }
  if (deprecatedConfig['version-resolver']) {
    parsedCategories.push() // TODO
  }

  return parsedCategories
}
