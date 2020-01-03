const SORT_BY = {
  mergedAt: 'merged_at',
  title: 'title'
}

const SORT_DIRECTIONS = {
  ascending: 'ascending',
  descending: 'descending'
}

module.exports.SORT_BY = SORT_BY
module.exports.SORT_DIRECTIONS = SORT_DIRECTIONS

module.exports.sortPullRequests = (pullRequests, sortBy, sortDirection) => {
  const getSortFieldFn = sortBy === SORT_BY.title ? getTitle : getMergedAt

  const sortFn =
    sortDirection === SORT_DIRECTIONS.ascending
      ? dateSortAscending
      : dateSortDescending

  return pullRequests
    .slice()
    .sort((a, b) => sortFn(getSortFieldFn(a), getSortFieldFn(b)))
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
