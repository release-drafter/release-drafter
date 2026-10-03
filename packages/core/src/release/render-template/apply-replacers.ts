import type { ParsedReplacer } from '../../types.ts'
import { parseReplaceString } from './util/index.ts'

const getReplaceMatches = (args: unknown[]): string[] => {
  const lastArg = args[args.length - 1]
  const hasGroups = typeof lastArg === 'object' && lastArg !== null
  const matchCount = args.length - (hasGroups ? 3 : 2)

  return args.slice(0, matchCount) as string[]
}

/** Applies the selected target's replacers in configuration order using the shared replacement syntax. */
export const applyReplacers = (
  input: string,
  replacers: ParsedReplacer[] = [],
  target: NonNullable<ParsedReplacer['target']> = 'global',
): string => {
  for (const replacer of replacers) {
    if ((replacer.target ?? 'global') !== target) continue
    const replacePattern = parseReplaceString(replacer.replace)
    // Each input starts a fresh match without changing caller-owned regex state.
    const search = new RegExp(replacer.search)
    input = input.replace(search, (...args) => {
      const matches = getReplaceMatches(args)
      return replacePattern.buildReplaceString(matches)
    })
  }
  return input
}
