import type * as z from 'zod'
import { array, object, string } from 'zod'

export const configSchema = object({
  /**
   * Defines pull request label rules.
   * `files` uses glob patterns. `branch`, `title`, and `body` use regular expressions.
   * A rule matches when at least one configured matcher succeeds.
   */
  autolabeler: array(
    object({
      label: string().min(1),
      files: array(string().min(1)).optional().default([]),
      branch: array(string().min(1)).optional().default([]),
      title: array(string().min(1)).optional().default([]),
      body: array(string().min(1)).optional().default([]),
    }),
  ).min(1),
}).meta({
  title: "JSON schema for Release Drafter's autolabeler action config.",
  id: 'https://github.com/release-drafter/release-drafter/blob/main/autolabeler/schema.json',
})

export type Config = z.output<typeof configSchema>
