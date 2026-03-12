import type * as z from 'zod'
import { array, object, string } from 'zod'

export const configSchema = object({
  /**
   * You can add automatically a label into a pull request.
   * Available matchers are `files` (glob), `branch` (regex), `title` (regex) and `body` (regex).
   * Matchers are evaluated independently; the label will be set if at least one of the matchers meets the criteria.
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
  id: 'https://github.com/release-drafter/release-drafter/blob/master/autolabeler/schema.json',
})

export type Config = z.output<typeof configSchema>
