import { z } from "../../../../external.js";
import { a as core } from "../../../../core.js";
const sortPullRequests = (params) => {
  const {
    pullRequests,
    config: { "sort-by": sortBy, "sort-direction": sortDirection }
  } = params;
  const getSortField = sortBy === "title" ? getTitle : getMergedAt;
  const sort = sortDirection === "ascending" ? dateSortAscending : dateSortDescending;
  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b));
    } catch (error) {
      core.warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`
      );
      core.error(error);
      return 0;
    }
  });
};
const getTitle = (pr) => pr.title;
const getMergedAt = (pr) => pr.mergedAt;
const supportedDateSchema = z.date().or(z.string()).transform((date) => {
  return typeof date === "string" ? new Date(date) : date;
});
const dateSortAscending = (date1, date2) => {
  const _date1 = supportedDateSchema.parse(date1);
  const _date2 = supportedDateSchema.parse(date2);
  if (_date1 > _date2) return 1;
  if (_date1 < _date2) return -1;
  return 0;
};
const dateSortDescending = (date1, date2) => {
  const _date1 = supportedDateSchema.parse(date1);
  const _date2 = supportedDateSchema.parse(date2);
  if (_date1 > _date2) return -1;
  if (_date1 < _date2) return 1;
  return 0;
};
export {
  sortPullRequests
};
//# sourceMappingURL=sort-pull-requests.js.map
