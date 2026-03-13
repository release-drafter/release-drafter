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
import { commonConfigSchema } from './common-config.schema'

export const exclusiveConfigSchema = object({
  /**
   * The template to use for each merged pull request.
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
   * Exclude pull requests using labels.
   */
  'exclude-labels': array(string()).optional().default([]),
  /**
   * Include only the specified pull requests using labels.
   */
  'include-labels': array(string()).optional().default([]),
  /**
   * Restrict pull requests included in the release notes to only the pull requests that modified any of the paths in this array. Supports files and directories.
   */
  'include-paths': array(string()).optional().default([]),
  /**
   * Exclude pull requests from the release notes if they modified any of the paths in this array. Supports files and directories. If used with `include-paths`, the exclusion takes precedence.
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
   * Categorize pull requests using labels.
   */
  categories: array(
    object({
      title: string().min(1),
      'collapse-after': number().int().min(0).optional().default(0),
      labels: array(string().min(1)).optional().default([]),
      label: string().min(1).optional(),
    }),
  )
    .optional()
    .default([]),
  /**
   * Adjust the `$RESOLVED_VERSION` variable using labels.
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
