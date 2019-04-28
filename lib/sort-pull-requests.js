const SORT_DIRECTIONS = {
  ascending: 'ascending',
  descending: 'descending'
}

module.exports.SORT_DIRECTIONS = SORT_DIRECTIONS

module.exports.validateSortDirection = sortDirection => {
  return Object.keys(SORT_DIRECTIONS).includes(sortDirection)
    ? sortDirection
    : SORT_DIRECTIONS.descending
}

module.exports.sortPullRequests = (pullRequests, sortDirection) => {
  const sortFn =
    sortDirection === SORT_DIRECTIONS.ascending
      ? dateSortAscending
      : dateSortDescending

  return pullRequests
    .slice()
    .sort((a, b) => sortFn(new Date(a.mergedAt), new Date(b.mergedAt)))
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
