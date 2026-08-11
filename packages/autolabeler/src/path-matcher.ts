import { Minimatch } from 'minimatch'

type PathRule = {
  directoryOnly: boolean
  matcher: Minimatch
  negated: boolean
}

const trimTrailingUnescapedSpaces = (pattern: string) => {
  let end = pattern.length
  while (end > 0 && pattern[end - 1] === ' ') {
    let backslashes = 0
    for (let index = end - 2; index >= 0 && pattern[index] === '\\'; index--)
      backslashes++
    if (backslashes % 2 === 1) break
    end--
  }
  return pattern.slice(0, end)
}

const compileRule = (pattern: string): PathRule | undefined => {
  let source = trimTrailingUnescapedSpaces(pattern)
  if (!source || source.startsWith('#')) return undefined

  const negated = source.startsWith('!')
  if (negated) source = source.slice(1)
  const directoryOnly = source.endsWith('/')
  if (directoryOnly) source = source.slice(0, -1)
  const anchored = source.startsWith('/')
  if (anchored) source = source.slice(1)
  if (!source) return undefined

  return {
    directoryOnly,
    negated,
    matcher: new Minimatch(source, {
      dot: true,
      matchBase: !anchored && !source.includes('/'),
      nobrace: true,
      nocomment: true,
      noext: true,
      nonegate: true,
      platform: 'linux',
    }),
  }
}

/** Compiles ordered gitignore-style patterns into a path predicate. */
export const createPathMatcher = (patterns: readonly string[]) => {
  const rules = patterns.flatMap((pattern) => {
    const rule = compileRule(pattern)
    return rule ? [rule] : []
  })

  return (path: string) => {
    const segments = path.split('/').filter(Boolean)
    for (const [index] of segments.entries()) {
      const candidate = segments.slice(0, index + 1).join('/')
      const directory = index < segments.length - 1
      let ignored = false
      for (const rule of rules) {
        if (rule.directoryOnly && !directory) continue
        if (rule.matcher.match(candidate)) ignored = !rule.negated
      }
      if (directory && ignored) return true
      if (!directory) return ignored
    }
    return false
  }
}
