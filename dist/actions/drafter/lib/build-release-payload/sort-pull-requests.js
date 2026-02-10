import { c as coreExports } from "../../../../core.js";
const sortPullRequests = (params) => {
  const {
    pullRequests,
    config: { "sort-by": sortBy, "sort-direction": sortDirection }
  } = params;
  const getSortField = sortBy === "title" ? getTitle : getMergedAt;
  const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b));
    } catch (error) {
      coreExports.warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`
      );
      coreExports.error(error);
      return 0;
    }
  });
};
const getTitle = (pr) => pr.title;
const getMergedAt = (pr) => pr.mergedAt;
const sortAscending = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
const sortDescending = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
};
export {
  sortPullRequests
};
