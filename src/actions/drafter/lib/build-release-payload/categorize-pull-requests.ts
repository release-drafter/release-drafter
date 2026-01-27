import { Config } from 'src/types'
import { findPullRequests } from '../find-pull-requests'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const categorizePullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<Config, 'exclude-labels' | 'include-labels' | 'categories'>
}): [Pr[], (Config['categories'][number] & { pullRequests: Pr[] })[]] => {
  const { pullRequests, config } = params

  const allCategoryLabels = new Set(
    config.categories.flatMap((category) => category.labels)
  )
  const uncategorizedPullRequests: Pr[] = []
  const categorizedPullRequests: (Config['categories'][number] & {
    pullRequests: Pr[]
  })[] = [...config.categories].map((category) => {
    return { ...category, pullRequests: [] }
  })

  const uncategorizedCategoryIndex = config.categories.findIndex(
    (category) => category.labels.length === 0
  )

  const filterUncategorizedPullRequests = (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []

    if (
      labels.length === 0 ||
      !labels.some(
        (label) => !!label?.name && allCategoryLabels.has(label?.name)
      )
    ) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest)
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest
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
          (label) => !!label?.name && category.labels.includes(label.name)
        )
      ) {
        category.pullRequests.push(pullRequest)
      }
    }
  }

  return [uncategorizedPullRequests, categorizedPullRequests]
}

export const getFilterExcludedPullRequests = (
  excludeLabels: Config['exclude-labels']
) => {
  return (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []
    if (
      labels.some(
        (label) => !!label?.name && excludeLabels.includes(label.name)
      )
    ) {
      return false
    }
    return true
  }
}

export const getFilterIncludedPullRequests = (
  includeLabels: Config['include-labels']
) => {
  return (pullRequest: Pr) => {
    const labels = pullRequest.labels?.nodes || []
    if (
      includeLabels.length === 0 ||
      labels.some(
        (label) => !!label?.name && includeLabels.includes(label.name)
      )
    ) {
      return true
    }
    return false
  }
}
