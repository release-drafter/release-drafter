import type { ParsedReplacer } from '../../types.ts'
import { selectSection } from './select-section.ts'
import { parseReplaceString } from './util/index.ts'

// Keep matching state private and allow regexes to be collected with their configs.
const searchCache = new WeakMap<RegExp, RegExp>()

const getSearch = (search: RegExp): RegExp => {
  const cached = searchCache.get(search)
  if (cached?.source === search.source && cached.flags === search.flags) {
    return cached
  }
  const compiled = new RegExp(search)
  searchCache.set(search, compiled)
  return compiled
}

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
    if (replacer.section !== undefined) {
      input =
        selectSection(input, replacer.section) ??
        (replacer['not-found'] === 'empty' ? '' : input)
      continue
    }
    const replacePattern = parseReplaceString(replacer.replace)
    const search = getSearch(replacer.search)
    search.lastIndex = 0
    let matched = false
    input = input.replace(search, (...args) => {
      matched = true
      const matches = getReplaceMatches(args)
      return replacePattern.buildReplaceString(matches)
    })
    if (!matched && replacer['not-found'] === 'empty') input = ''
  }
  return input
}
