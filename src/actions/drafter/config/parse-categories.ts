import * as core from '@actions/core'
import { type Config, configSchemaDefaults } from './schemas/config.schema'

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
    ]
      .map((condition) => {
        const { path, label, ..._cond } = condition

        return {
          ..._cond,
          paths: [...(condition.paths || []), ...(path ? [path] : [])],
          labels: [...(condition.labels || []), ...(label ? [label] : [])],
        }
      })
      // Filter-out empty conditions
      .filter(
        (condition) =>
          condition.paths.length > 0 ||
          condition.labels.length > 0 ||
          condition['labels-mode'] !== 'any' ||
          condition['paths-mode'] !== 'any',
      )

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
        if (title) {
          core.warning(
            `Title "${title}" ignored for category of type "${_cat.type}"`,
          )
        }
        if (collapseAfter) {
          core.warning(
            `"collapse-after" "${collapseAfter}" ignored for category of type "${_cat.type}"`,
          )
        }
        return {
          type: 'version-resolver' as const,
          when: parsedWhenConditions,
          'semver-increment': semverIncrement,
          exclusive,
        }
      case 'pre-exclude':
      case 'pre-include':
        if (title) {
          core.warning(
            `Title "${title}" ignored for category of type "${_cat.type}"`,
          )
        }
        if (collapseAfter) {
          core.warning(
            `"collapse-after" "${collapseAfter}" ignored for category of type "${_cat.type}"`,
          )
        }
        if (exclusive) {
          core.warning(
            `"exclusive" "${exclusive}" ignored for category of type "${_cat.type}"`,
          )
        }
        if (semverIncrement !== 'patch') {
          core.warning(
            `"semver-increment" "${semverIncrement}" ignored for category of type "${_cat.type}"`,
          )
        }
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
    core.warning(
      `Use of deprecated 'exclude-labels' or 'exclude-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-exclude"' category.`,
    )
    if (
      parsedCategories.findIndex((cat) => cat.type === 'pre-exclude') !== -1
    ) {
      throw new Error(
        "A 'pre-exclude' category already exists. Cannot migrate deprecated exclude-labels or exclude-paths fields. Please either remove the deprecated fields or remove the existing 'pre-exclude' category to resolve this conflict.",
      )
    }
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
    core.warning(
      `Use of deprecated 'include-labels' or 'include-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-include"' category.`,
    )
    if (
      parsedCategories.findIndex((cat) => cat.type === 'pre-include') !== -1
    ) {
      throw new Error(
        "A 'pre-include' category already exists. Cannot migrate deprecated include-labels or include-paths fields. Please either remove the deprecated fields or remove the existing 'pre-include' category to resolve this conflict.",
      )
    }
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
  if (
    deprecatedConfig['version-resolver'].default !==
    configSchemaDefaults['version-resolver'].default
  ) {
    core.warning(
      `Use of deprecated 'version-resolver.default' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "${deprecatedConfig['version-resolver'].default}"' to 'type: changelog' category with no 'when' condition (uncategorized changes), or move the default resolver to a new category with type 'version-resolver' and 'semver-increment' set to "${deprecatedConfig['version-resolver'].default}" - also without 'when' conditions. `,
    )
    if (
      parsedCategories.findIndex(
        (cat) => cat.type === 'version-resolver' && cat.when.length === 0,
      ) !== -1
    ) {
      throw new Error(
        "A 'version-resolver' category with no 'when' condition already exists. Cannot migrate deprecated 'version-resolver.default' field. Please either remove the deprecated field or remove the existing 'version-resolver' category to resolve this conflict.",
      )
    }
    parsedCategories.push({
      type: 'version-resolver',
      'semver-increment': deprecatedConfig['version-resolver'].default,
      when: [],
      exclusive: false,
    })
  }
  if (
    deprecatedConfig['version-resolver'].major.labels !==
      configSchemaDefaults['version-resolver'].major.labels &&
    deprecatedConfig['version-resolver'].major.labels.length > 0
  ) {
    core.warning(
      `Use of deprecated 'version-resolver.major.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "major"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.major.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'major'. `,
    )
    parsedCategories.push({
      type: 'version-resolver',
      'semver-increment': 'major',
      when: [
        {
          labels: deprecatedConfig['version-resolver'].major.labels || [],
          'labels-mode': 'any',
          paths: [],
          'paths-mode': 'any',
        },
      ],
      exclusive: false,
    })
  }
  if (
    deprecatedConfig['version-resolver'].minor.labels !==
      configSchemaDefaults['version-resolver'].minor.labels &&
    deprecatedConfig['version-resolver'].minor.labels.length > 0
  ) {
    core.warning(
      `Use of deprecated 'version-resolver.minor.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "minor"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.minor.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'minor'. `,
    )
    parsedCategories.push({
      type: 'version-resolver',
      'semver-increment': 'minor',
      when: [
        {
          labels: deprecatedConfig['version-resolver'].minor.labels || [],
          'labels-mode': 'any',
          paths: [],
          'paths-mode': 'any',
        },
      ],
      exclusive: false,
    })
  }
  if (
    deprecatedConfig['version-resolver'].patch.labels !==
      configSchemaDefaults['version-resolver'].patch.labels &&
    deprecatedConfig['version-resolver'].patch.labels.length > 0
  ) {
    core.warning(
      `Use of deprecated 'version-resolver.patch.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "patch"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.patch.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'patch'. `,
    )
    parsedCategories.push({
      type: 'version-resolver',
      'semver-increment': 'patch',
      when: [
        {
          labels: deprecatedConfig['version-resolver'].patch.labels || [],
          'labels-mode': 'any',
          paths: [],
          'paths-mode': 'any',
        },
      ],
      exclusive: false,
    })
  }

  return parsedCategories
}
