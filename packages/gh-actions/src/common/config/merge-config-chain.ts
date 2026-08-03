import * as core from '@actions/core'
import type { MergeStrategy } from './extends.schema.ts'
import type { getConfigFiles } from './get-config-files.ts'
import { describeConfigTarget } from './parse-config-target.ts'

const toMergeableList = (
  value: unknown,
  strategy: MergeStrategy,
  key: string,
  description: string,
): unknown[] => {
  // YAML parses an empty value (`categories:`) to null; treat it like an
  // absent key so merging to/from it works.
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw new Error(
      `Cannot ${strategy} '${key}': ${description} is not a list (got ${typeof value}).`,
    )
  }
  return value
}

/**
 * Merges an `_extends` chain (ordered leaf-first, as returned by
 * `getConfigFiles`) into a single config object.
 *
 * Keys merge shallowly by default: the extending file's value replaces the
 * inherited one. A file can opt into appending or prepending a list key
 * to/onto the inherited list via the mapping form of `_extends`
 * (`_extends: {from: ..., strategy: {<key>: append|prepend}}`). A file's
 * strategy governs only the step where that file itself is merged onto the
 * configs it extends; it is not inherited by files extending it. The
 * `_extends` key is stripped from the result.
 */
export const mergeConfigChain = (
  configResults: Awaited<ReturnType<typeof getConfigFiles>>,
) => {
  const merged: Record<string, unknown> = {}
  // reverse to base-first so each file merges onto everything it extends
  for (const { config, fetchedFrom } of [...configResults].reverse()) {
    const { _extends, ...rest } = config
    const strategies = _extends?.strategy ?? {}
    // A strategy for a key the file does not set is inert (likely a typo).
    for (const key of Object.keys(strategies)) {
      if (!Object.hasOwn(rest, key)) {
        core.warning(
          `_extends strategy declares '${key}' in ${describeConfigTarget(fetchedFrom)}, but the file does not set '${key}'; the strategy has no effect.`,
        )
      }
    }
    for (const [key, value] of Object.entries(rest)) {
      // Object.hasOwn guards against config keys that collide with
      // Object.prototype members (e.g. `toString`, `constructor`).
      const declared = Object.hasOwn(strategies, key)
        ? strategies[key]
        : undefined
      const strategy = declared ?? 'override'
      if (strategy === 'override') {
        merged[key] = value
        continue
      }
      const inherited = toMergeableList(
        Object.hasOwn(merged, key) ? merged[key] : undefined,
        strategy,
        key,
        `the value inherited by ${describeConfigTarget(fetchedFrom)}`,
      )
      const own = toMergeableList(
        value,
        strategy,
        key,
        `the value in ${describeConfigTarget(fetchedFrom)}`,
      )
      merged[key] =
        strategy === 'append' ? [...inherited, ...own] : [...own, ...inherited]
      core.info(
        `_extends strategy: ${strategy}ed ${own.length} '${key}' item(s) from ${describeConfigTarget(fetchedFrom)} onto ${inherited.length} inherited item(s)`,
      )
    }
  }
  return merged
}
