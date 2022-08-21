import _ from 'lodash'
import { paginate } from './pagination.js'
import {
	CommitWithAssociatedPullRequests,
	GitHubRelease,
	PullRequest,
	ReleaseDrafterConfig,
	ReleaseDrafterContext,
} from './types.js'

export type CommitsWithPathChanges = {
	repository: {
		object: {
			history: {
				nodes: {
					id: string
				}
			}
		}
	}
}

export const findCommitsWithPathChangesQuery = /* GraphQL */ `
	query findCommitsWithPathChangesQuery(
		$name: String!
		$owner: String!
		$targetCommitish: String!
		$since: GitTimestamp
		$after: String
		$path: String
	) {
		repository(name: $name, owner: $owner) {
			object(expression: $targetCommitish) {
				... on Commit {
					history(path: $path, since: $since, after: $after) {
						pageInfo {
							hasNextPage
							endCursor
						}
						nodes {
							id
						}
					}
				}
			}
		}
	}
`

export type RepositoryObjectWithHistory = {
	repository: {
		object: {
			history: {
				pageInfo: {
					hasNextPage: boolean
					endCursor: string
				}
				nodes: CommitWithAssociatedPullRequests[]
			}
		}
	}
}

export const findCommitsWithAssociatedPullRequestsQuery = /* GraphQL */ `
	query findCommitsWithAssociatedPullRequests(
		$name: String!
		$owner: String!
		$targetCommitish: String!
		$withPullRequestBody: Boolean!
		$withPullRequestURL: Boolean!
		$since: GitTimestamp
		$after: String
		$withBaseRefName: Boolean!
		$withHeadRefName: Boolean!
	) {
		repository(name: $name, owner: $owner) {
			object(expression: $targetCommitish) {
				... on Commit {
					history(first: 100, since: $since, after: $after) {
						totalCount
						pageInfo {
							hasNextPage
							endCursor
						}
						nodes {
							id
							committedDate
							message
							author {
								name
								user {
									login
								}
							}
							associatedPullRequests(first: 5) {
								nodes {
									title
									number
									url @include(if: $withPullRequestURL)
									body @include(if: $withPullRequestBody)
									author {
										login
									}
									baseRepository {
										nameWithOwner
									}
									mergedAt
									isCrossRepository
									labels(first: 10) {
										nodes {
											name
										}
									}
									merged
									baseRefName @include(if: $withBaseRefName)
									headRefName @include(if: $withHeadRefName)
								}
							}
						}
					}
				}
			}
		}
	}
`

export const findCommitsWithAssociatedPullRequests: ({
	context,
	targetCommitish,
	lastRelease,
	config,
}: {
	context: ReleaseDrafterContext
	targetCommitish: string
	lastRelease: GitHubRelease | null
	config: ReleaseDrafterConfig
}) => Promise<{
	commits: CommitWithAssociatedPullRequests[]
	pullRequests: PullRequest[]
}> = async ({
	context,
	targetCommitish,
	lastRelease,
	config,
}: {
	context: ReleaseDrafterContext
	targetCommitish: string
	lastRelease: GitHubRelease | null
	config: ReleaseDrafterConfig
}) => {
	const variables = {
		name: context.repo,
		owner: context.owner,
		targetCommitish,
		withPullRequestBody: config.changeTemplate.includes('$BODY'),
		withPullRequestURL: config.changeTemplate.includes('$URL'),
		withBaseRefName: config.changeTemplate.includes('$BASE_REF_NAME'),
		withHeadRefName: config.changeTemplate.includes('$HEAD_REF_NAME'),
		since: lastRelease?.created_at ?? undefined,
	}
	const includePaths = config.includePaths
	const dataPath = ['repository', 'object', 'history']
	const repoNameWithOwner = context.ownerRepo()

	const includedIds: Record<string, Set<string>> = {}

	if (includePaths.length > 0) {
		let anyChanges = false
		for (const path of includePaths) {
			const pathData = await paginate<CommitsWithPathChanges>(
				context.octokit.graphql,
				findCommitsWithPathChangesQuery,
				lastRelease
					? { ...variables, since: lastRelease.created_at, path }
					: { ...variables, path },
				dataPath,
			)
			const commitsWithPathChanges = _.get(pathData, [...dataPath, 'nodes'])

			includedIds[path] = includedIds[path] || new Set([])
			for (const { id } of commitsWithPathChanges) {
				anyChanges = true
				includedIds[path].add(id)
			}
		}

		if (!anyChanges) {
			// Short circuit to avoid blowing GraphQL budget
			return { commits: [], pullRequests: [] }
		}
	}

	const data = await paginate<RepositoryObjectWithHistory>(
		context.octokit.graphql,
		findCommitsWithAssociatedPullRequestsQuery,
		variables,
		dataPath,
	)

	const filterCommit = (commit: CommitWithAssociatedPullRequests) => {
		if (includePaths.length > 0) {
			let included = false
			for (const path of includePaths) {
				if (includedIds[path].has(commit.id)) {
					included = true
					break
				}
			}
			if (!included) {
				return false
			}
		}
		if (lastRelease) {
			return new Date(commit.committedDate) > new Date(lastRelease.created_at)
		}
		return true
	}

	const commits: CommitWithAssociatedPullRequests[] = _.get(data, [
		...dataPath,
		'nodes',
	]).filter((commit: CommitWithAssociatedPullRequests) => filterCommit(commit))

	const pullRequests = _.uniqBy(
		commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []),
		'number',
	).filter(
		(pr) => pr.baseRepository.nameWithOwner === repoNameWithOwner && pr.merged,
	)

	return { commits, pullRequests }
}
