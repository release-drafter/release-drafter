import type { ParsedConfig } from 'src/actions/drafter/config'
import type { findPullRequests } from '../../find-pull-requests'
import { hasConventionalCriteria } from './conventional-matching'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const categorizePullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<ParsedConfig, 'exclude-labels' | 'include-labels' | 'categories'>
}): [Pr[], (ParsedConfig['categories'][number] & { pullRequests: Pr[] })[]] => {
  const { pullRequests, config } = params

  const allCategoryLabels = new Set(
    config.categories.flatMap((category) => [...category.labels]),
  )
  const uncategorizedPullRequests: Pr[] = []
  const categorizedPullRequests: (ParsedConfig['categories'][number] & {
    pullRequests: Pr[]
  })[] = [...config.categories].map((category) => {
    return { ...category, pullRequests: [] }
  })

  const uncategorizedCategoryIndex = config.categories.findIndex(
    (category) =>
      category.labels.size === 0 &&
      !hasConventionalCriteria(category.conventional),
  )

  const filterUncategorizedPullRequests = (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []

    if (
      labels.length === 0 ||
      !labels.some(
        (label) => !!label?.name && allCategoryLabels.has(label?.name),
      )
    ) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest)
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest,
        )
      }
      return false
    }
    return true
  }

  // we only want pull requests that have yet to be categorized
  const filteredPullRequests = pullRequests
    .filter(getFilterExcludedPullRequests(config['exclude-labels']))
    .filter(getFilterIncludedPullRequests(config['include-labels']))
    .filter((pullRequest) => filterUncategorizedPullRequests(pullRequest))

  for (const category of categorizedPullRequests) {
    for (const pullRequest of filteredPullRequests) {
      // lets categorize some pull request based on labels
      // note that having the same label in multiple categories
      // then it is intended to "duplicate" the pull request into each category
      const labels = pullRequest.labels?.nodes || []
      if (
        labels.some(
          (label) => !!label?.name && category.labels.has(label.name),
        )
      ) {
        category.pullRequests.push(pullRequest)
      }
    }
  }

  return [uncategorizedPullRequests, categorizedPullRequests]
}

export const getFilterExcludedPullRequests = (
  excludeLabels: ParsedConfig['exclude-labels'],
) => {
  return (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []
    if (
      labels.some(
        (label) => !!label?.name && excludeLabels.has(label.name),
      )
    ) {
      return false
    }
    return true
  }
}

export const getFilterIncludedPullRequests = (
  includeLabels: ParsedConfig['include-labels'],
) => {
  return (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []
    if (
      includeLabels.size === 0 ||
      labels.some(
        (label) => !!label?.name && includeLabels.has(label.name),
      )
    ) {
      return true
    }
    return false
  }
}
