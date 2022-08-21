import _ from 'lodash'
import { paginate } from './pagination.js'
import {
	GitHubRelease,
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

export type CommitsWithAssociatedPullRequests = {
	repository: {
		object: {
			history: {
				pageInfo: {
					hasNextPage: boolean
					endCursor: string
				}
				nodes: {
					id: string
					committedDate: string
					message: string
					author: {
						name: string
						user: {
							login: string
						}
					}
					associatedPullRequests: {
						nodes: {
							title: string
							number: number
							mergedAt: string
							isCrossRepository: boolean
							merged: boolean
							url?: string
							body?: string
							baseRefName?: string
							headRefName?: string
							author: {
								login: string
							}
							baseRepository: {
								nameWithOwner: string
							}
							labels: {
								nodes: {
									name: string
								}
							}
						}
					}
				}
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

export const findCommitsWithAssociatedPullRequests = async ({
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

	const allCommits = []
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

	const data = await paginate<CommitsWithAssociatedPullRequests>(
		context.octokit.graphql,
		findCommitsWithAssociatedPullRequestsQuery,
		variables,
		dataPath,
	)

	if (lastRelease) {
		// log({
		// 	context,
		// 	message: `Fetching parent commits of ${targetCommitish} since ${lastRelease.created_at}`,
		// })
		// GraphQL call is inclusive of commits from the specified dates.  This means the final
		// commit from the last tag is included, so we remove this here.
		allCommits.push(
			_.get(data, [...dataPath, 'nodes']).filter(
				(commit: { committedDate: string }) =>
					commit.committedDate != lastRelease.created_at,
			),
		)
	} else {
		// log({ context, message: `Fetching parent commits of ${targetCommitish}` })

		allCommits.push(_.get(data, [...dataPath, 'nodes']))
	}

	const commits =
		includePaths.length > 0
			? allCommits.filter((commit) =>
					includePaths.some((path) => includedIds[path].has(commit.id)),
			  )
			: allCommits

	const pullRequests = _.uniqBy(
		commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []),
		'number',
	).filter(
		(pr) => pr.baseRepository.nameWithOwner === repoNameWithOwner && pr.merged,
	)

	return { commits, pullRequests }
}
