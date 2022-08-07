import { PullRequest } from '@octokit/graphql-schema'
import { SORT_BY, SORT_DIRECTIONS } from './enums.js'

export function sortPullRequests(
	pullRequests: PullRequest[],
	sortBy: SORT_BY,
	sortDirection: SORT_DIRECTIONS,
) {
	const getSortField = sortBy === SORT_BY.title ? getTitle : getMergedAt

	const sort =
		sortDirection === SORT_DIRECTIONS.ascending
			? dateSortAscending
			: dateSortDescending

	return [...pullRequests].sort((a, b) =>
		sort(getSortField(a), getSortField(b)),
	)
}

function getMergedAt(pullRequest: PullRequest) {
	return new Date(pullRequest.mergedAt)
}

function getTitle(pullRequest: PullRequest) {
	return pullRequest.title
}

function dateSortAscending(date1: Date | string, date2: Date | string) {
	if (date1 > date2) return 1
	if (date1 < date2) return -1
	return 0
}

function dateSortDescending(date1: Date | string, date2: Date | string) {
	if (date1 > date2) return -1
	if (date1 < date2) return 1
	return 0
}
