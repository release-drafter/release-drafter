import type * as z from 'zod'
import {
  array,
  boolean,
  number,
  object,
  string,
  ZodDefault,
  enum as zenum,
} from 'zod'
import { commonConfigSchema } from './common-config.schema.ts'

/**
 * A single set of predicates that are combined with AND logic.
 * All specified predicates must be satisfied for a change to match.
 */
const changeConditionSchema = object({
  /**
   * Label predicate: matches a change that carries this label.
   *
   * Shorthand for adding a single value to `labels`.
   * If `label` and `labels` are both specified, they are combined.
   *
   * Use `labels-mode` to configure how this label is compared to change labels.
   */
  label: string().min(1).optional(),
  /**
   * Labels predicate: matches a change that carries these labels.
   *
   * `labels-mode` defaults to `any`, so the condition matches when the change
   * shares at least one configured label unless another mode is set.
   *
   * Use `labels-mode` to configure how these labels are compared to change labels.
   */
  labels: array(string().min(1)).optional().default([]),
  /**
   * Matching mode for the `labels` predicate.
   *
   * Has no effect unless `label` or `labels` is configured in the same condition.
   *
   * The comparison is set-based (label order is ignored).
   *
   * - `any`: Change and configured labels overlap (current behavior).
   * - `all`: Change contains every configured label. Change can have more labels.
   * - `only`: Every change label is included in configured labels. Configured labels can specify more.
   * - `exactly`: Change labels and configured labels are the same set.
   */
  'labels-mode': zenum(['any', 'all', 'only', 'exactly'])
    .optional()
    .default('any'),
  /**
   * Path predicate: matches a change that touched this path pattern. Supports glob patterns.
   *
   * Same as specifying a single `paths` value.
   * If `path` and `paths` are both specified, they are combined.
   *
   * Use `paths-mode` to configure how this path is matched against the matched
   * configured path patterns for a change.
   */
  path: string().min(1).optional(),
  /**
   * Paths predicate: matches a change that touched any of these path patterns.
   * Values support glob patterns.
   *
   * If `path` and `paths` are both specified, they are combined before
   * `paths-mode` is applied.
   *
   * Use `paths-mode` to configure how these path patterns are compared to the
   * matched configured path patterns for a change.
   */
  paths: array(string().min(1)).optional().default([]),
  /**
   * Matching mode for the `paths` predicate.
   *
   * Has no effect unless `path` or `paths` is configured in the same condition.
   *
   * The comparison is set-based (path order is ignored).
   *
   * - `any`: At least one configured path pattern matched the change.
   * - `all`: Every configured path pattern matched the change.
   * - `only`: Every matched configured path pattern is included in the condition.
   * - `exactly`: The set of matched configured path patterns equals the condition.
   */
  'paths-mode': zenum(['any', 'all', 'only', 'exactly'])
    .optional()
    .default('any'),
})

export const changeConditionSchemaDefaults = changeConditionSchema.parse({})
export type ChangeConditionConfig = z.input<typeof changeConditionSchema>

const categorySchema = object({
  /**
   * Expanded in $TITLE in the category-template.
   *
   * Required when `type` is `changelog` (default).
   * This is enforced during merged-config validation rather than by this schema alone.
   *
   * May be omitted for non-changelog categories because
   * they are not rendered in the changelog output.
   */
  title: string().min(1).optional(),

  /**
   * The type of the category.
   *
   * - `changelog`: Included in the generated changelog.
   * - `pre-include`: Keep only matching changes for later changelog categorization.
   * - `pre-exclude`: Exclude matching changes for later changelog categorization. Is run against changes that were included in category type `pre-include` if specified.
   * - `version-resolver`: Used solely to determine `$RESOLVED_VERSION` from the changes this category matches, without rendering a changelog section. Use `type: 'changelog'` (default) and `categories[*].semver-increment` instead if you mean this category to also be included in the changelog.
   *
   * `pre-include` always runs before `pre-exclude` in the pipeline.
   * Omitted values default to `changelog`.
   *
   * @default "changelog"
   */
  type: zenum(['changelog', 'pre-include', 'pre-exclude', 'version-resolver'])
    .optional()
    .default('changelog'),

  /**
   * Whether changes included in this category should be excluded from other categories.
   *
   * Default behavior allows changes to appear in multiple categories if they match multiple category criteria.
   *
   * Only applicable to categories of `type: changelog` or `type: version-resolver`.
   * This only controls inclusion for a single category type at a time, so a change can still match
   * one exclusive changelog category and one exclusive version-resolver category.
   *
   * @default false
   */
  exclusive: boolean().optional().default(false),

  /**
   * Collapses the category's change list into a `<details>`/`<summary>` block
   * when the number of changes is greater than this value.
   *
   * Only applicable to categories of `type: changelog`.
   *
   * Set to `0` to always collapse. Set to `-1` to disable collapsing.
   *
   * @default -1
   */
  'collapse-after': number().int().min(-1).optional().default(-1),

  /**
   * Which version increment this category contributes to `$RESOLVED_VERSION`.
   *
   * For `type: changelog` categories, this applies to changes that end up assigned
   * to the category after changelog matching and `exclusive` handling.
   * For `type: version-resolver` categories, this applies to changes the category
   * matches directly, with a category that omits `when` acting as the fallback
   * when no other `type: version-resolver` category matches.
   *
   * If multiple categories contribute, the most severe increment wins.
   * For example, if one contributing category has `semver-increment: 'minor'`
   * and another has `semver-increment: 'patch'`, the resulting increment will
   * be `minor`.
   *
   * Applicable to categories of `type: changelog` and `type: version-resolver`.
   * Ignored for `type: pre-include` and `type: pre-exclude`.
   *
   * @default "patch"
   */
  'semver-increment': zenum(['major', 'minor', 'patch'])
    .optional()
    .default('patch'),

  /**
   * Compatibility shorthand for adding label matching to this category.
   *
   * Equivalent to adding the same `labels` predicate to every `when` condition.
   *
   * @deprecated Use `when.labels` instead.
   */
  labels: array(string().min(1)).optional().default([]),
  /**
   * Compatibility shorthand for adding a single label match to this category.
   *
   * Equivalent to adding the same `label` predicate to every `when` condition.
   *
   * @deprecated Use `when.label` instead.
   */
  label: string().min(1).optional(),

  /**
   * Conditions that determine whether a change belongs to this category.
   *
   * Can be specified as:
   * - A **single condition** (object): the change must satisfy all predicates in that condition.
   * - An **array of conditions**: the change must satisfy all predicates of **at least one**
   *   condition (OR logic across conditions, AND logic within each condition).
   *
   * An empty array (default) matches all changes.
   *
   * @example
   * # Shorthand: single condition (must have label "bug" AND touch "src/")
   * when:
   *   labels: [bug]
   *   paths: [src/**]
   *
   * @example
   * # Array: (label "bug" AND path "src/") OR (label "enhancement")
   * when:
   *   - labels: [bug]
   *     paths: [src/**]
   *   - labels: [enhancement]
   */
  when: changeConditionSchema
    .or(array(changeConditionSchema))
    .optional()
    .default([]),
})

export const categorySchemaDefaults = categorySchema.parse({})
export type CategoryConfig = z.input<typeof categorySchema>

export const exclusiveConfigSchema = object({
  /**
   * The template to use for each merged change.
   */
  'change-template': string()
    .optional()
    .default('* $TITLE (#$NUMBER) @$AUTHOR'),
  /**
   * Characters to escape in `$TITLE` when inserting into `change-template` so that they are not interpreted as Markdown format characters.
   */
  'change-title-escapes': string().optional(),
  /**
   * The template to use for when there’s no changes.
   */
  'no-changes-template': string().optional().default('* No changes'),
  /**
   * The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning.
   */
  'version-template': string()
    .optional()
    .default('$MAJOR.$MINOR.$PATCH$PRERELEASE'),
  /**
   * The template for the name of the draft release.
   */
  'name-template': string().optional(),
  /**
   * A known prefix used to filter release tags. For matching tags, this prefix is stripped before attempting to parse the version.
   */
  'tag-prefix': string().optional(),
  /**
   * The template for the tag of the draft release.
   */
  'tag-template': string().optional(),
  /**
   * Exclude changes using labels.
   *
   * @deprecated Use a `type: pre-exclude` category with `when.labels` instead.
   */
  'exclude-labels': array(string()).optional().default([]),
  /**
   * Include only the specified changes using labels.
   *
   * @deprecated Use a `type: pre-include` category with `when.labels` instead.
   */
  'include-labels': array(string()).optional().default([]),
  /**
   * Restrict changes included in the release notes to only the changes that modified any of the paths in this array.
   * Supports files and directories.
   *
   * @deprecated Use a `type: pre-include` category with `when.paths` instead.
   */
  'include-paths': array(string()).optional().default([]),
  /**
   * Exclude changes from the release notes if they modified any of the paths in this array.
   * Supports files and directories. If used with `include-paths`, the exclusion takes precedence.
   *
   * @deprecated This field keeps legacy commit-level filtering semantics. A
   * `type: pre-exclude` category with `when.paths` filters at the change level
   * instead and is not fully equivalent.
   */
  'exclude-paths': array(string()).optional().default([]),
  /**
   * Exclude specific usernames from the generated `$CONTRIBUTORS` variable.
   */
  'exclude-contributors': array(string()).optional().default([]),
  /**
   * The template to use for `$CONTRIBUTORS` when there's no contributors to list.
   */
  'no-contributors-template': string().optional().default('No contributors'),
  /**
   * Sort changelog by merged_at or title.
   */
  'sort-by': zenum(['merged_at', 'title']).optional().default('merged_at'),
  /**
   * Sort changelog in ascending or descending order.
   */
  'sort-direction': zenum(['ascending', 'descending'])
    .optional()
    .default('descending'),
  /**
   * Filter previous releases to consider only those with the target matching `commitish`.
   */
  'filter-by-commitish': boolean().optional().default(false),
  'pull-request-limit': number().int().positive().optional().default(5),
  /**
   * Size of the pagination window when walking the repo. Can avoid erratic 502s from Github. Default: `15`
   */
  'history-limit': number().int().positive().optional().default(15),
  /**
   * Search and replace content in the generated changelog body.
   */
  replacers: array(
    object({
      search: string().min(1),
      replace: string().min(0),
    }),
  )
    .optional()
    .default([]),

  /**
   * Categorize changes
   */
  categories: array(categorySchema).optional().default([]),

  /**
   * Adjust the `$RESOLVED_VERSION` variable using labels.
   *
   * @deprecated Use a category with a `semver-increment` instead. Use category[ies] with `type: version-resolver` to separate version resolution from changelog inclusion concerns.
   */
  'version-resolver': object({
    major: object({
      labels: array(string().min(1)),
    })
      .optional()
      .default({ labels: [] }),
    minor: object({
      labels: array(string().min(1)),
    })
      .optional()
      .default({ labels: [] }),
    patch: object({
      labels: array(string().min(1)),
    })
      .optional()
      .default({ labels: [] }),
    default: zenum(['major', 'minor', 'patch']).optional().default('patch'),
  })
    .optional()
    .default({
      major: { labels: [] },
      minor: { labels: [] },
      patch: { labels: [] },
      default: 'patch',
    }),

  /**
   * The template to use for each category.
   */
  'category-template': string().optional().default('## $TITLE'),
  /**
   * The template for the body of the draft release.
   * Optional as it may be inherited via `_extends`.
   */
  template: string().optional().default(''),
}).meta({
  title: 'JSON schema for Release Drafter yaml files',
  id: 'https://github.com/release-drafter/release-drafter/blob/master/drafter/schema.json',
})

export const configSchema = exclusiveConfigSchema.and(commonConfigSchema)

/**
 * Configs exclusive to the config-file
 *
 * For the full config params, see `Config`
 *
 * For the config params that can be overwritten by the action's input, see `CommonConfig`
 */
export type ExclusiveConfig = z.output<typeof exclusiveConfigSchema>

/**
 * Full config params (from the config-file)
 *
 * For the config params exclusive to the config-file, see `ExclusiveConfig`
 *
 * For the config params that can be overwritten by the action's input, see `CommonConfig`
 */
export type Config = z.output<typeof configSchema>

export const configSchemaDefaults = Object.fromEntries(
  Object.entries({
    ...exclusiveConfigSchema.shape,
    ...commonConfigSchema.shape,
  }).map(([key, value]) => {
    if (value instanceof ZodDefault) return [key, value.def.defaultValue]
    return [key, undefined]
  }),
) as Config
