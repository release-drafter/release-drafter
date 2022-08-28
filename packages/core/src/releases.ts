import compareVersions from 'compare-versions'
import regexEscape from 'escape-string-regexp'

import { getVersionInfo } from './versions.js'
import { transformTemplate } from './transform-template.js'
import {
	CommitWithAssociatedPullRequests,
	GitHubRelease,
	Label,
	PullRequest,
	ReleaseDrafterCategorizedPullRequest,
	ReleaseDrafterCategory,
	ReleaseDrafterConfig,
	ReleaseDrafterContext,
	VersionResolver,
} from './types.js'
import { ReleaseType } from 'semver'

const sortReleases = (releases: GitHubRelease[]) => {
	// For semver, we find the greatest release number
	// For non-semver, we use the most recently merged
	try {
		return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
	} catch {
		return releases.sort(
			(r1, r2) =>
				new Date(r1.created_at).getDate() - new Date(r2.created_at).getDate(),
		)
	}
}

// GitHub API currently returns a 500 HTTP response if you attempt to fetch over 1000 releases.
const RELEASE_COUNT_LIMIT = 1000

export const findReleases = async ({
	context,
	targetCommitish,
	filterByCommitish,
	tagPrefix,
}: {
	context: ReleaseDrafterContext
	targetCommitish: string
	filterByCommitish: boolean
	tagPrefix: string
}) => {
	let releaseCount = 0
	const releases = (await context.octokit.paginate(
		context.octokit.rest.repos.listReleases.endpoint.merge({
			owner: context.owner,
			repo: context.repo,
			per_page: 100,
		}),
		(response, done) => {
			releaseCount += response.data.length
			if (releaseCount >= RELEASE_COUNT_LIMIT) {
				done()
			}
			return response.data
		},
	)) as GitHubRelease[]

	// log({ context, message: `Found ${releases.length} releases` })

	// `refs/heads/branch` and `branch` are the same thing in this context
	const headReferenceRegex = /^refs\/heads\//
	const targetCommitishName = targetCommitish.replace(headReferenceRegex, '')
	const commitishFilteredReleases = filterByCommitish
		? releases.filter(
				(r) =>
					targetCommitishName ===
					r.target_commitish.replace(headReferenceRegex, ''),
		  )
		: releases
	const filteredReleases = tagPrefix
		? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix))
		: commitishFilteredReleases
	const sortedPublishedReleases = sortReleases(
		filteredReleases.filter((r) => !r.draft),
	)
	const draftRelease = filteredReleases.find((r) => r.draft)
	const lastRelease =
		sortedPublishedReleases[sortedPublishedReleases.length - 1]

	// TODO(jetersen): Move to outer methods
	if (draftRelease) {
		// log({ context, message: `Draft release: ${draftRelease.tag_name}` })
	} else {
		// log({ context, message: `No draft release found` })
	}

	if (lastRelease) {
		// log({ context, message: `Last release: ${lastRelease.tag_name}` })
	} else {
		// log({ context, message: `No last release found` })
	}

	return { draftRelease, lastRelease }
}

const contributorsSentence = ({
	commits,
	pullRequests,
	config,
}: {
	commits: CommitWithAssociatedPullRequests[]
	pullRequests: PullRequest[]
	config: ReleaseDrafterConfig
}): string => {
	const {
		'exclude-contributors': excludeContributors,
		'no-contributors-template': noContributorsTemplate,
	} = config

	const contributors = new Set<string>()

	for (const commit of commits) {
		if (commit.author?.user) {
			if (!excludeContributors.includes(commit.author.user.login)) {
				contributors.add(`@${commit.author.user.login}`)
			}
		} else if (commit.author?.name) {
			contributors.add(commit.author.name)
		}
	}

	for (const pullRequest of pullRequests) {
		if (
			pullRequest.author &&
			!excludeContributors.includes(pullRequest.author.login)
		) {
			contributors.add(`@${pullRequest.author.login}`)
		}
	}

	const sortedContributors = [...contributors].sort()
	if (sortedContributors.length > 1) {
		return (
			sortedContributors.slice(0, -1).join(', ') +
			' and ' +
			sortedContributors.slice(-1)
		)
	} else if (sortedContributors.length === 1) {
		return sortedContributors[0]
	} else {
		return noContributorsTemplate
	}
}

const getFilterExcludedPullRequests = (
	pullRequest: PullRequest,
	excludeLabels: string[],
) => {
	const labels = pullRequest.labels?.nodes
	return !labels?.some((label) => excludeLabels.includes(label?.name ?? ''))
}

const getFilterIncludedPullRequests = (
	pullRequest: PullRequest,
	includeLabels: string[],
) => {
	const labels = pullRequest.labels?.nodes
	return (
		includeLabels.length === 0 ||
		labels?.some((label) => includeLabels.includes(label?.name ?? ''))
	)
}

function getUncategorizedCategoryIndex(categories: ReleaseDrafterCategory[]) {
	const index = categories.findIndex((category) => category.labels.length === 0)
	return index === -1 ? 0 : index
}

const categorizePullRequests = (
	pullRequests: PullRequest[],
	config: ReleaseDrafterConfig,
): ReleaseDrafterCategorizedPullRequest[] => {
	const {
		'exclude-labels': excludeLabels,
		'include-labels': includeLabels,
		categories,
	} = config

	if (categories.length === 0) {
		return [
			{
				pullRequests: pullRequests,
				labels: [],
				'collapse-after': 0,
			},
		]
	}

	const allCategoryLabels = new Set(
		categories.flatMap((category) => category.labels),
	)

	const uncategorizedCategoryIndex = getUncategorizedCategoryIndex(categories)

	const categorizedPullRequests: ReleaseDrafterCategorizedPullRequest[] = []

	if (uncategorizedCategoryIndex === 0) {
		categorizedPullRequests.push({
			pullRequests: [],
			labels: [],
			'collapse-after': 0,
		})
	}

	categories.map((category) => {
		categorizedPullRequests.push({
			...category,
			pullRequests: [],
		})
	})

	const filterUncategorizedPullRequests = (pullRequest: PullRequest) => {
		const labels: Label[] = pullRequest.labels?.nodes || []

		if (
			labels.length === 0 ||
			!labels.some((label) => allCategoryLabels.has(label?.name ?? ''))
		) {
			categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
				pullRequest,
			)
			return false
		}
		return true
	}

	const filterAllPullRequests = (
		pullRequest: PullRequest,
		excludeLabels: string[],
		includeLabels: string[],
	) => {
		return (
			getFilterExcludedPullRequests(pullRequest, excludeLabels) &&
			getFilterIncludedPullRequests(pullRequest, includeLabels) &&
			filterUncategorizedPullRequests(pullRequest)
		)
	}

	// we only want pull requests that have yet to be categorized
	const filteredPullRequests = pullRequests.filter((pullRequest) =>
		filterAllPullRequests(pullRequest, excludeLabels, includeLabels),
	)

	for (const category of categorizedPullRequests) {
		if (category.pullRequests == undefined) {
			category.pullRequests = []
		}
		for (const pullRequest of filteredPullRequests) {
			// lets categorize some pull request based on labels
			// note that having the same label in multiple categories
			// then it is intended to "duplicate" the pull request into each category
			const labels = pullRequest.labels?.nodes || []
			if (labels.some((label) => category.labels.includes(label.name))) {
				category.pullRequests.push(pullRequest)
			}
		}
	}

	return categorizedPullRequests
}

export const generateChangeLog = (
	pullRequests: PullRequest[],
	config: ReleaseDrafterConfig,
) => {
	if (pullRequests.length === 0) {
		return config['no-changes-template']
	}
	const {
		'category-template': categoryTemplate,
		'change-template': changeTemplate,
		'change-title-escapes': changeTitleEscapes,
	} = config

	const categorizedPullRequests = categorizePullRequests(pullRequests, config)

	const escapeTitle = (title: string) =>
		// If config['changeTitleEscapes'] contains backticks, then they will be escaped along with content contained inside backticks
		// If not, the entire backtick block is matched so that it will become a markdown code block without escaping any of its content
		title.replace(
			new RegExp(`[${regexEscape(changeTitleEscapes)}]|\`.*?\``, 'g'),
			(match: string) => {
				if (match.length > 1) return match
				if (match == '@' || match == '#') return `${match}<!---->`
				return `\\${match}`
			},
		)

	const pullRequestsToString = (pullRequests: PullRequest[]) =>
		pullRequests
			.map((pullRequest) =>
				transformTemplate(changeTemplate, {
					$TITLE: escapeTitle(pullRequest.title),
					$NUMBER: pullRequest.number,
					$AUTHOR: pullRequest.author ? pullRequest.author.login : 'ghost',
					$BODY: pullRequest.body,
					$URL: pullRequest.url,
					$BASE_REF_NAME: pullRequest.baseRefName,
					$HEAD_REF_NAME: pullRequest.headRefName,
				}),
			)
			.join('\n')

	const changeLog = []

	for (const [index, category] of categorizedPullRequests.entries()) {
		if (category.pullRequests.length === 0) {
			continue
		}

		const { title, pullRequests, 'collapse-after': collapseAfter } = category

		// Add the category title to the changelog.
		if (title) {
			changeLog.push(
				transformTemplate(categoryTemplate, { $TITLE: title }),
				'\n\n',
			)
		}

		// Define the pull requests into a single string.
		const pullRequestString = pullRequestsToString(pullRequests)

		// Determine the collapse status.
		const shouldCollapse =
			collapseAfter !== 0 && pullRequests.length > collapseAfter

		// Add the pull requests to the changelog.
		if (shouldCollapse) {
			changeLog.push(
				'<details>',
				'\n',
				`<summary>${pullRequests.length} changes</summary>`,
				'\n\n',
				pullRequestString,
				'\n',
				'</details>',
			)
		} else {
			changeLog.push(pullRequestString)
		}

		if (index + 1 !== categorizedPullRequests.length) changeLog.push('\n\n')
	}

	return changeLog.join('').trim()
}

type VersionResolverKeys = keyof Omit<VersionResolver, 'default'>

const resolveVersionKeyIncrement = (
	pullRequests: PullRequest[],
	config: ReleaseDrafterConfig,
) => {
	const {
		'version-resolver': versionResolver,
		'exclude-labels': excludeLabels,
		'include-labels': includeLabels,
	} = config

	const priorityMap: {
		[key in VersionResolverKeys]: number
	} = {
		patch: 1,
		minor: 2,
		major: 3,
	}
	const labelToKeyMap = Object.fromEntries(
		Object.keys(priorityMap)
			.flatMap((key) => {
				return [
					versionResolver[key as VersionResolverKeys].labels.map(
						(label: string) => [label, key],
					),
				]
			})
			.flat(),
	)
	const keys: string[] = pullRequests
		.filter(
			(pullRequest) =>
				getFilterExcludedPullRequests(pullRequest, excludeLabels) &&
				getFilterIncludedPullRequests(pullRequest, includeLabels),
		)
		.flatMap((pr: PullRequest) =>
			pr.labels?.nodes?.map((node) => labelToKeyMap[node?.name ?? '']),
		)
		.filter(Boolean)
	const keyPriorities = keys.map(
		(key) => priorityMap[key as VersionResolverKeys],
	)
	const priority = Math.max(...keyPriorities)
	const versionKey = Object.keys(priorityMap).find(
		(key) => priorityMap[key as VersionResolverKeys] === priority,
	)
	return (versionKey || versionResolver.default) as ReleaseType
}

type ReleaseInfo = {
	prerelease: boolean
	draft: boolean
	name: string
	tag: string
	body: string
	targetCommitish: string
}

export async function generateReleaseInfo({
	context,
	commits,
	config,
	lastRelease,
	pullRequests,
	version,
	tag,
	name,
	isPreRelease,
	shouldDraft,
	targetCommitish,
}: {
	context: ReleaseDrafterContext
	config: ReleaseDrafterConfig
	commits: CommitWithAssociatedPullRequests[]
	lastRelease: GitHubRelease
	pullRequests: PullRequest[]
	version: string | undefined
	tag: string | undefined
	name: string | undefined
	isPreRelease: boolean
	shouldDraft: boolean
	targetCommitish: string
}): Promise<ReleaseInfo> {
	const {
		header,
		template,
		footer,
		replacers,
		'version-template': versionTemplate,
		'tag-prefix': tagPrefix,
		'name-template': nameTemplate,
		'tag-template': tagTemplate,
	} = config

	let body = header + template + footer

	body = transformTemplate(
		body,
		{
			$PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
			$CHANGES: generateChangeLog(pullRequests, config),
			$CONTRIBUTORS: contributorsSentence({
				commits,
				pullRequests,
				config,
			}),
			$OWNER: context.owner,
			$REPOSITORY: context.repo,
		},
		replacers,
	)

	const versionInfo = getVersionInfo(
		lastRelease,
		versionTemplate,
		// Use the first override parameter to identify
		// a version, from the most accurate to the least
		version || tag || name,
		resolveVersionKeyIncrement(pullRequests, config),
		tagPrefix,
	)

	if (versionInfo) {
		body = transformTemplate(body, versionInfo)
	}

	if (tag === undefined) {
		tag = versionInfo ? transformTemplate(tagTemplate || '', versionInfo) : ''
	} else if (versionInfo) {
		tag = transformTemplate(tag, versionInfo)
	}

	if (name === undefined) {
		name = versionInfo ? transformTemplate(nameTemplate || '', versionInfo) : ''
	} else if (versionInfo) {
		name = transformTemplate(name, versionInfo)
	}

	// Tags are not supported as `target_commitish` by GitHub API.
	// GITHUB_REF or the ref from webhook start with `refs/tags/`, so we handle
	// those here. If it doesn't but is still a tag - it must have been set
	// explicitly by the user, so it's fair to just let the API respond with an error.
	if (targetCommitish.startsWith('refs/tags/')) {
		targetCommitish = ''
	}

	return {
		name,
		tag,
		body,
		targetCommitish,
		prerelease: isPreRelease,
		draft: shouldDraft,
	}
}

export const createRelease = ({
	context,
	releaseInfo,
}: {
	context: ReleaseDrafterContext
	releaseInfo: ReleaseInfo
}) => {
	return context.octokit.rest.repos.createRelease({
		owner: context.owner,
		repo: context.repo,
		target_commitish: releaseInfo.targetCommitish,
		name: releaseInfo.name,
		tag_name: releaseInfo.tag,
		body: releaseInfo.body,
		draft: releaseInfo.draft,
		prerelease: releaseInfo.prerelease,
	})
}

export const updateRelease = ({
	context,
	draftRelease,
	releaseInfo,
}: {
	context: ReleaseDrafterContext
	draftRelease: GitHubRelease
	releaseInfo: ReleaseInfo
}) => {
	const updateReleaseParameters = updateDraftReleaseParameters({
		name: releaseInfo.name || draftRelease.name,
		tag_name: releaseInfo.tag || draftRelease.tag_name,
		target_commitish: releaseInfo.targetCommitish,
	})

	return context.octokit.rest.repos.updateRelease({
		owner: context.owner,
		repo: context.repo,
		release_id: draftRelease.id,
		body: releaseInfo.body,
		draft: releaseInfo.draft,
		prerelease: releaseInfo.prerelease,
		...updateReleaseParameters,
	})
}

function updateDraftReleaseParameters(parameters: {
	name?: string
	tag_name?: string
	target_commitish?: string
}) {
	const updateReleaseParameters = { ...parameters }

	// Let GitHub figure out `name` and `tag_name` if undefined
	if (!updateReleaseParameters.name) {
		delete updateReleaseParameters.name
	}
	if (!updateReleaseParameters.tag_name) {
		delete updateReleaseParameters.tag_name
	}

	// Keep existing `target_commitish` if not overriden
	// (sending `null` resets it to the default branch)
	if (!updateReleaseParameters.target_commitish) {
		delete updateReleaseParameters.target_commitish
	}

	return updateReleaseParameters
}
