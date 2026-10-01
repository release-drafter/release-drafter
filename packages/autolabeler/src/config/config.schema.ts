import type * as z from 'zod'
import { array, boolean, object, string } from 'zod'

const labelSchema = string()
  .min(1)
  .describe('Backward-compatible single label. Prefer labels for new rules.')
const labelsSchema = array(string().min(1))
  .min(1)
  .describe('Labels to add when this rule matches, in configuration order.')
const ruleSchema = object({
  labels: labelsSchema.optional(),
  label: labelSchema.optional(),
  /** Add these labels only when no ordinary rule matches. */
  fallback: boolean().optional().default(false),
  /** Stop evaluating later rules after this rule matches and adds its labels. */
  'stop-on-match': boolean().optional().default(false),
  files: array(string().min(1)).optional().default([]),
  branch: array(string().min(1)).optional().default([]),
  title: array(string().min(1)).optional().default([]),
  body: array(string().min(1)).optional().default([]),
})

export const configSchema = object({
  'sync-labels': boolean()
    .optional()
    .default(false)
    .describe(
      'Remove configured labels when they are not selected by this run.',
    ),
  /**
   * Defines pull request label rules.
   * `files` uses glob patterns. `branch`, `title`, and `body` use regular expressions.
   * A rule matches when at least one configured matcher succeeds.
   */
  autolabeler: array(
    // Require at least one form without refinements so JSON Schema validates it too.
    ruleSchema
      .extend({ labels: labelsSchema })
      .or(ruleSchema.extend({ label: labelSchema })),
  ),
}).meta({
  title: "JSON schema for Release Drafter's autolabeler action config.",
  id: 'https://github.com/release-drafter/release-drafter/blob/main/autolabeler/schema.json',
})

export type Config = z.output<typeof configSchema>
