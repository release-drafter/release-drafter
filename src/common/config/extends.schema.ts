import type * as z from 'zod'
import {
  looseObject,
  record,
  strictObject,
  string,
  union,
  enum as zenum,
  null as znull,
} from 'zod'

export const MERGE_STRATEGIES = ['override', 'append', 'prepend'] as const
export const mergeStrategySchema = zenum(MERGE_STRATEGIES)
export type MergeStrategy = z.output<typeof mergeStrategySchema>

const mergeStrategiesSchema = record(string(), mergeStrategySchema)

/**
 * Schema for the `_extends` key: either a plain target string, or a mapping
 * with `from` (same target syntax) and an optional per-key merge `strategy`.
 * The mapping is strict because composition errors on unknown keys; this way
 * editors flag the same typos the action would reject at runtime.
 *
 * Empty string and null values remain valid no-ops for compatibility with the
 * historical string form. Zod normalizes every active declaration to the
 * mapping shape consumed by config loading and composition.
 */
export const extendsDeclarationSchema = union([
  string(),
  znull(),
  strictObject({
    from: string().regex(/\S/, "'from' must not be blank"),
    // YAML parses an empty value (`strategy:`) to null; treat it as absent.
    strategy: mergeStrategiesSchema.nullish(),
  }),
])
  .optional()
  .transform((value) => {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      return undefined
    }

    if (typeof value === 'string') {
      return { from: value.trim(), strategy: {} }
    }

    return {
      from: value.from.trim(),
      strategy: value.strategy ?? {},
    }
  })

export type ExtendsDeclaration = Exclude<
  z.output<typeof extendsDeclarationSchema>,
  undefined
>

/**
 * Parses the common envelope of a raw config file while retaining all
 * action-specific keys for composition and later validation.
 */
export const configFileSchema = looseObject({
  _extends: extendsDeclarationSchema,
})
