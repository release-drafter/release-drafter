import { record, strictObject, string, enum as zenum } from 'zod'
import { MERGE_STRATEGIES } from './parse-extends.ts'

export const mergeStrategySchema = zenum(MERGE_STRATEGIES)

/**
 * Schema for the `_extends` key: either a plain target string, or a mapping
 * with `from` (same target syntax) and an optional per-key merge `strategy`.
 * The mapping is strict because composition errors on unknown keys; this way
 * editors flag the same typos the action would reject at runtime.
 *
 * `_extends` is stripped while the configuration chain is composed, so it
 * never reaches an action's config schema. This schema exists to describe the
 * raw YAML a user writes, and is only used to generate the JSON schema that
 * editors validate against.
 */
export const extendsDeclarationSchema = string()
  .min(1)
  .or(
    strictObject({
      from: string().min(1),
      strategy: record(string(), mergeStrategySchema).optional(),
    }),
  )
