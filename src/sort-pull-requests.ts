import _ from 'lodash'
import { PullRequest } from './types'

export type SortDirection = keyof typeof SORT_DIRECTIONS

export const SORT_DIRECTIONS = {
  ascending: 'ascending',
  descending: 'descending'
}

export function validateSortDirection(sortDirection: string): SortDirection {
  return _.get(SORT_DIRECTIONS, sortDirection, SORT_DIRECTIONS.descending)
}

export function sortPullRequests(
  pullRequests: PullRequest[],
  sortDirection: SortDirection
): PullRequest[] {
  const sortFn =
    sortDirection === SORT_DIRECTIONS.ascending
      ? dateSortAscending
      : dateSortDescending

  return pullRequests
    .slice()
    .sort((a, b) => sortFn(new Date(a.mergedAt), new Date(b.mergedAt)))
}

function dateSortAscending(date1: Date, date2: Date) {
  if (date1 > date2) return 1
  if (date1 < date2) return -1
  return 0
}

function dateSortDescending(date1: Date, date2: Date) {
  if (date1 > date2) return -1
  if (date1 < date2) return 1
  return 0
}
