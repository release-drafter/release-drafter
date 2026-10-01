import type * as z from 'zod'
import { array, boolean, object, string } from 'zod'

export const configSchema = object({
  /**
   * Defines pull request label rules.
   * `files` uses glob patterns. `branch`, `title`, and `body` use regular expressions.
   * A rule matches when at least one configured matcher succeeds.
   */
  autolabeler: array(
    object({
      /** Labels to add when this rule matches, in configuration order. */
      label: string()
        .min(1)
        .or(array(string().min(1)).min(1)),
      /** Stop evaluating later rules after this rule matches and adds its labels. */
      'stop-on-match': boolean().optional().default(false),
      files: array(string().min(1)).optional().default([]),
      branch: array(string().min(1)).optional().default([]),
      title: array(string().min(1)).optional().default([]),
      body: array(string().min(1)).optional().default([]),
    }),
  ),
  /** Added when no rule matches, including when the rule list is empty. */
  'autolabeler-fallback-label': string().min(1).optional(),
}).meta({
  title: "JSON schema for Release Drafter's autolabeler action config.",
  id: 'https://github.com/release-drafter/release-drafter/blob/main/autolabeler/schema.json',
})

export type Config = z.output<typeof configSchema>
