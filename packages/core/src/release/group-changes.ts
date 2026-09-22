import type { Logger } from '../ports.ts'
import type { ParsedGroupChange, PullRequest } from '../types.ts'
import { renderTemplate } from './render-template/index.ts'

export type ChangeGroup = {
  /** Members ordered from the oldest to the newest merged pull request. */
  pullRequests: PullRequest[]
  /** The newest member, used for every single-valued change template variable. */
  representative: PullRequest
  /** The unescaped title: built from `title-template` for several members, the original one otherwise. */
  title: string
}

/**
 * Groups pull requests whose titles match the same `group` of a `group-changes`
 * rule into a single changelog entry. Pull requests are neither mutated nor
 * reordered: a grouped entry takes the place of its newest member.
 */
export const groupChanges = (params: {
  pullRequests: PullRequest[]
  rules?: ParsedGroupChange[]
  logger?: Logger
}): ChangeGroup[] => {
  const { pullRequests, rules = [], logger } = params
  if (rules.length === 0)
    return pullRequests.map((pullRequest) => ({
      pullRequests: [pullRequest],
      representative: pullRequest,
      title: pullRequest.title,
    }))

  const members = new Map<string, PullRequest[]>()
  const ruleOf = new Map<string, ParsedGroupChange>()
  const keys: string[] = []

  for (const [index, pullRequest] of pullRequests.entries()) {
    const match = matchRule(pullRequest, rules)
    if (!match) {
      const key = `ungrouped ${index}`
      keys.push(key)
      members.set(key, [pullRequest])
      continue
    }
    // The rule index keeps identical group values of different rules apart.
    const key = `rule ${match.index} ${JSON.stringify(match.values)}`
    const existing = members.get(key)
    if (existing) {
      existing.push(pullRequest)
      continue
    }
    keys.push(key)
    members.set(key, [pullRequest])
    ruleOf.set(key, match.rule)
  }

  const positions = new Map(
    pullRequests.map((pullRequest, index) => [pullRequest, index]),
  )

  return keys
    .map((key) => {
      const grouped = [...(members.get(key) ?? [])].sort(byMergeOrder)
      const representative = grouped[grouped.length - 1]
      const rule = ruleOf.get(key)
      return {
        pullRequests: grouped,
        representative,
        title:
          grouped.length > 1 && rule
            ? groupTitle({ pullRequests: grouped, rule, logger })
            : representative.title,
      }
    })
    .sort(
      (a, b) =>
        (positions.get(a.representative) ?? 0) -
        (positions.get(b.representative) ?? 0),
    )
}

/**
 * Finds the first rule that matches and reads its grouping values. Changes are
 * grouped only when every grouping capture holds the same value, so a bump of
 * the same dependency in another submodule stays a change of its own.
 */
const matchRule = (pullRequest: PullRequest, rules: ParsedGroupChange[]) => {
  for (const [index, rule] of rules.entries()) {
    const groups = rule.pattern.exec(pullRequest.title)?.groups
    if (!groups) continue
    const values = rule.groupNames.map((name) => groups[name] ?? '')
    if (values.some((value) => value.trim())) return { values, index, rule }
  }
  return undefined
}

/** Orders members the way they were merged, oldest first. */
const byMergeOrder = (a: PullRequest, b: PullRequest) => {
  if (a.mergedAt && b.mergedAt && a.mergedAt !== b.mergedAt)
    return a.mergedAt < b.mergedAt ? -1 : 1
  return a.number - b.number
}

const groupTitle = (params: {
  pullRequests: PullRequest[]
  rule: ParsedGroupChange
  logger?: Logger
}) => {
  const { pullRequests, rule, logger } = params
  const oldest = rule.pattern.exec(pullRequests[0].title)?.groups ?? {}
  const newest =
    rule.pattern.exec(pullRequests[pullRequests.length - 1].title)?.groups ?? {}
  const object: Record<string, string> = {}
  for (const name of rule.groupNames) {
    object[`$${name.toUpperCase()}`] = newest[name] ?? ''
  }
  for (const name of rule.captureNames) {
    object[`$FIRST_${name.toUpperCase()}`] = oldest[name] ?? ''
    object[`$LAST_${name.toUpperCase()}`] = newest[name] ?? ''
  }
  const title = renderTemplate({ template: rule['title-template'], object })
  logger?.debug(
    `Grouped ${pullRequests.map(({ number }) => `#${number}`).join(', ')} into '${title}'`,
  )
  return title
}
