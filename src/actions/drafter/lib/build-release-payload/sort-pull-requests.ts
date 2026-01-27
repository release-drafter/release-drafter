import { Config } from 'src/types'
import { findPullRequests } from '../find-pull-requests'
import z from 'zod'
import core from '@actions/core'

type Pr = Awaited<ReturnType<typeof findPullRequests>>['pullRequests'][number]
type TPrMergedAt = Pr['mergedAt']

export const sortPullRequests = (params: {
  pullRequests: Pr[]
  config: Pick<Config, 'sort-by' | 'sort-direction'>
}) => {
  const {
    pullRequests,
    config: { 'sort-by': sortBy, 'sort-direction': sortDirection }
  } = params

  const getSortField = sortBy === 'title' ? getTitle : getMergedAt

  const sort =
    sortDirection === 'ascending' ? dateSortAscending : dateSortDescending

  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b))
    } catch (error) {
      core.warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`
      )
      core.error(error as Error)
      return 0
    }
  })
}

const getTitle = (pr: Pr) => pr.title
const getMergedAt = (pr: Pr): TPrMergedAt => pr.mergedAt

const supportedDateSchema = z
  .date()
  .or(z.string())
  .transform((date) => {
    return typeof date === 'string' ? new Date(date) : date
  })

const dateSortAscending = (date1: TPrMergedAt, date2: TPrMergedAt) => {
  const _date1 = supportedDateSchema.parse(date1)
  const _date2 = supportedDateSchema.parse(date2)
  if (_date1 > _date2) return 1
  if (_date1 < _date2) return -1
  return 0
}

const dateSortDescending = (date1: TPrMergedAt, date2: TPrMergedAt) => {
  const _date1 = supportedDateSchema.parse(date1)
  const _date2 = supportedDateSchema.parse(date2)
  if (_date1 > _date2) return -1
  if (_date1 < _date2) return 1
  return 0
}
