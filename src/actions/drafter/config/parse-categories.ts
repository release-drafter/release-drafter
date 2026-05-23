import * as core from '@actions/core'
import {
  type CategoryConfig,
  type Config,
  categorySchemaDefaults,
  changeConditionSchemaDefaults,
  configSchemaDefaults,
} from './schemas/config.schema.ts'

type RawCategory = CategoryConfig

/**
 * Parses all categories from the config, normalizing conditions and
 * handling backward compatibility with deprecated fields.
 *
 * This function:
 * - Normalizes a missing `type` to `changelog` to match schema defaults
 * - Normalizes the `when` field to always be an array of conditions
 * - Applies deprecated category-level `label`/`labels` shorthands to every
 *   normalized `when` condition
 * - Warns when deprecated compatibility fields are used
 * - Preserves all other category fields as-is
 *
 * Accepts both fully-typed and partial category objects for flexibility.
 *
 * @param categories - Categories from the raw config
 * @returns Array of fully parsed categories with normalized conditions
 */
export function parseCategories(
  categories: { categories: RawCategory[] },
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
      'collapse-after': rawCollapseAfter,
      'semver-increment': rawSemverIncrement,
      exclusive: rawExclusive,
      title,

      // Rest
      ..._cat
    } = cat

    const collapseAfter =
      rawCollapseAfter ?? categorySchemaDefaults['collapse-after']
    const semverIncrement =
      rawSemverIncrement ?? categorySchemaDefaults['semver-increment']
    const exclusive = rawExclusive ?? categorySchemaDefaults.exclusive

    const deprecatedLabels = [...(labels || []), ...(label ? [label] : [])]

    if (deprecatedLabels.length > 0) {
      core.warning(
        `Use of deprecated 'categories[*].label' or 'categories[*].labels' field detected${title ? ` on category "${title}"` : ''}. Please migrate. This field will be removed in a future release. To migrate, move the labels into the category's 'when' condition.`,
      )
    }

    const whenConditions =
      _when !== undefined
        ? Array.isArray(_when)
          ? _when.length > 0 || deprecatedLabels.length === 0
            ? _when
            : [{}]
          : [_when]
        : deprecatedLabels.length > 0
          ? [{}]
          : []

    const parsedWhenConditions = whenConditions
      .map((condition) => {
        const { path, label, ..._cond } = condition

        // Deprecated category-level labels are shorthand for adding the same
        // label predicate to every `when` branch
        return {
          ...changeConditionSchemaDefaults,
          ..._cond,
          'labels-mode':
            condition['labels-mode'] ??
            changeConditionSchemaDefaults['labels-mode'],
          'paths-mode':
            condition['paths-mode'] ??
            changeConditionSchemaDefaults['paths-mode'],
          paths: [...(condition.paths || []), ...(path ? [path] : [])],
          labels: [
            ...deprecatedLabels,
            ...(condition.labels || []),
            ...(label ? [label] : []),
          ],
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

    const categoryType = _cat.type ?? categorySchemaDefaults.type

    switch (categoryType) {
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
            `Title "${title}" ignored for category of type "${categoryType}"`,
          )
        }
        if (collapseAfter !== -1) {
          core.warning(
            `"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`,
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
            `Title "${title}" ignored for category of type "${categoryType}"`,
          )
        }
        if (collapseAfter !== -1) {
          core.warning(
            `"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`,
          )
        }
        if (exclusive) {
          throw new Error(
            `"exclusive" can only be set on categories of type "changelog" or "version-resolver"; it cannot be used on category of type "${categoryType}".`,
          )
        }
        if (semverIncrement !== 'patch') {
          core.warning(
            `"semver-increment" "${semverIncrement}" ignored for category of type "${categoryType}"`,
          )
        }
        return {
          type: categoryType,
          when: parsedWhenConditions,
        }
      default:
        throw new Error(`Unsupported category type: ${categoryType}`)
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
