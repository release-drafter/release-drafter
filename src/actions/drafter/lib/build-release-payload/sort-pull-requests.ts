import * as core from '@actions/core'
import type { Config } from '../../config/index.ts'
import type { findPullRequests } from '../find-pull-requests/index.ts'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]

export const sortPullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<Config, 'sort-by' | 'sort-direction'>
}) => {
  const {
    pullRequests,
    config: { 'sort-by': sortBy, 'sort-direction': sortDirection },
  } = params

  const getSortField = sortBy === 'title' ? getTitle : getMergedAt

  const sort = sortDirection === 'ascending' ? sortAscending : sortDescending

  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b))
    } catch (error) {
      core.warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`,
      )
      core.error(error as Error)
      return 0
    }
  })
}

const getTitle = (pr: Pr) => pr.title
const getMergedAt = (pr: Pr) => pr.mergedAt

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
