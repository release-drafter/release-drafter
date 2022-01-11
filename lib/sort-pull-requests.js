export const SORT_BY = {
  mergedAt: 'merged_at',
  title: 'title',
}

export const SORT_DIRECTIONS = {
  ascending: 'ascending',
  descending: 'descending',
}

export const sortPullRequests = (pullRequests, sortBy, sortDirection) => {
  const getSortField = sortBy === SORT_BY.title ? getTitle : getMergedAt

  const sort =
    sortDirection === SORT_DIRECTIONS.ascending
      ? dateSortAscending
      : dateSortDescending

  return [...pullRequests].sort((a, b) =>
    sort(getSortField(a), getSortField(b))
  )
}

function getMergedAt(pullRequest) {
  return new Date(pullRequest.mergedAt)
}

function getTitle(pullRequest) {
  return pullRequest.title
}

function dateSortAscending(date1, date2) {
  if (date1 > date2) return 1
  if (date1 < date2) return -1
  return 0
}

function dateSortDescending(date1, date2) {
  if (date1 > date2) return -1
  if (date1 < date2) return 1
  return 0
}
