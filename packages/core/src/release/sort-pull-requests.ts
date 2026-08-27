import type { Config } from '../config/config.schema.ts'
import type { Logger } from '../ports.ts'
import type { PullRequest } from '../types.ts'

export const sortPullRequests = (params: {
  pullRequests: PullRequest[]
  logger: Logger
  config: Pick<Config, 'sort-by' | 'sort-direction'>
}) => {
  const {
    pullRequests,
    logger,
    config: { 'sort-by': sortBy, 'sort-direction': sortDirection },
  } = params

  const getSortField = sortBy === 'title' ? getTitle : getMergedAt

  const sort = sortDirection === 'ascending' ? sortAscending : sortDescending

  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b))
    } catch (error) {
      logger.warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`,
      )
      logger.error(error as Error)
      return 0
    }
  })
}

const getTitle = (pr: PullRequest) => pr.title
const getMergedAt = (pr: PullRequest) => pr.mergedAt

type TData = ReturnType<typeof getTitle> | ReturnType<typeof getMergedAt>

const sortAscending = (a: TData, b: TData) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a > b) return 1
  if (a < b) return -1
  return 0
}

const sortDescending = (a: TData, b: TData) => {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (a > b) return -1
  if (a < b) return 1
  return 0
}
