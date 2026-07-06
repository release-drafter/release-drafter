import type { ConfigTarget } from './parse-config-target.ts'

export const MERGE_STRATEGIES = ['override', 'append', 'prepend'] as const
export type MergeStrategy = (typeof MERGE_STRATEGIES)[number]

/** Merge strategies per config key. Keys without one default to `override`. */
export type MergeStrategies = Partial<Record<string, MergeStrategy>>

export type ExtendsDeclaration = {
  from: string
  strategy: MergeStrategies
}

export const describeTarget = (target: ConfigTarget) =>
  `${target.scheme}:${target.filepath}${target.repo ? ` (${target.repo.owner}/${target.repo.repo})` : ''}`

const isMergeStrategy = (value: unknown): value is MergeStrategy =>
  MERGE_STRATEGIES.includes(value as MergeStrategy)

const parseStrategy = (
  value: unknown,
  fetchedFrom: ConfigTarget,
): MergeStrategies => {
  // YAML parses an empty value (`strategy:`) to null; treat it like absent
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `Invalid '_extends' strategy in ${describeTarget(fetchedFrom)}: expected a mapping of config keys to one of: ${MERGE_STRATEGIES.join(', ')}.`,
    )
  }
  const strategies: MergeStrategies = {}
  for (const [key, strategy] of Object.entries(value)) {
    if (!isMergeStrategy(strategy)) {
      throw new Error(
        `Invalid '_extends' strategy '${strategy}' for key '${key}' in ${describeTarget(fetchedFrom)}: expected one of: ${MERGE_STRATEGIES.join(', ')}.`,
      )
    }
    strategies[key] = strategy
  }
  return strategies
}

/**
 * Parses and validates a file's `_extends` declaration. Both forms are
 * supported: the plain target string, and a mapping with `from` (same
 * target syntax) plus an optional per-key `strategy` selecting how the
 * file's keys are merged onto the configs it extends.
 */
export const parseExtendsDeclaration = (
  value: unknown,
  fetchedFrom: ConfigTarget,
): ExtendsDeclaration | undefined => {
  if (value === undefined || value === null) return undefined
  // An empty/blank string is treated as absent (no `_extends`), matching the
  // historical behavior where any falsy value stopped the chain.
  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : { from: value, strategy: {} }
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `Invalid '_extends' in ${describeTarget(fetchedFrom)}: expected a target string or a mapping with 'from' and an optional 'strategy'.`,
    )
  }
  const { from, strategy, ...unknownKeys } = value as Record<string, unknown>
  if (Object.keys(unknownKeys).length > 0) {
    throw new Error(
      `Invalid '_extends' in ${describeTarget(fetchedFrom)}: unknown key(s) ${Object.keys(
        unknownKeys,
      )
        .map((key) => `'${key}'`)
        .join(', ')}; expected 'from' and an optional 'strategy'.`,
    )
  }
  if (typeof from !== 'string' || from === '') {
    throw new Error(
      `Invalid '_extends' in ${describeTarget(fetchedFrom)}: 'from' must be a target string.`,
    )
  }
  return { from, strategy: parseStrategy(strategy, fetchedFrom) }
}
