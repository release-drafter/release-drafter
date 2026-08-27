import ignore from 'ignore'
import type { ParsedConfig } from './config/parse-config.ts'

export type PullRequestFacts = {
  files: readonly string[]
  branch: string
  title: string
  body: string | null
}

export type AutolabelMatch = {
  label: string
  matcher: 'files' | 'branch' | 'title' | 'body'
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
  const matcher = ignore().add(patterns)
  return files.some((file) => matcher.ignores(file))
}

/** Evaluates configured rules in files, branch, title, and body order. */
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
      labels.add(rule.label)
      matches.push({ label: rule.label, matcher })
    }
  }

  return { labels: [...labels], matches }
}
