import type { ParsedConfig } from './config/parse-config.ts'
import { createPathMatcher } from './path-matcher.ts'

export type PullRequestFacts = {
  files: readonly string[]
  branch: string
  title: string
  body: string | null
}

export type AutolabelMatch = {
  label: string
  matcher: 'files' | 'branch' | 'title' | 'body' | 'fallback'
}

const test = (matcher: RegExp, value: string) => {
  matcher.lastIndex = 0
  return matcher.test(value)
}

const matchesFiles = (
  patterns: readonly string[],
  files: readonly string[],
) => {
  if (patterns.length === 0) return false
  const matches = createPathMatcher(patterns)
  return files.some(matches)
}

/** Evaluates rules in configuration order, stopping on request or adding a fallback. */
export const matchLabels = (params: {
  config: ParsedConfig
  pullRequest: PullRequestFacts
}) => {
  const { config, pullRequest } = params
  const labels = new Set<string>()
  const matches: AutolabelMatch[] = []

  for (const rule of config.autolabeler) {
    const body = pullRequest.body
    let matcher: AutolabelMatch['matcher'] | undefined
    if (matchesFiles(rule.files, pullRequest.files)) {
      matcher = 'files'
    } else if (rule.branch.some((regex) => test(regex, pullRequest.branch))) {
      matcher = 'branch'
    } else if (rule.title.some((regex) => test(regex, pullRequest.title))) {
      matcher = 'title'
    } else if (body != null && rule.body.some((regex) => test(regex, body))) {
      matcher = 'body'
    }

    if (matcher) {
      for (const label of rule.labels) {
        labels.add(label)
        matches.push({ label, matcher })
      }
      if (rule['stop-on-match']) break
    }
  }

  const fallback = config['fallback-label']
  if (labels.size === 0 && fallback !== undefined) {
    labels.add(fallback)
    matches.push({ label: fallback, matcher: 'fallback' })
  }

  return { labels: [...labels], matches }
}
