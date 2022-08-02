import {
	Configuration,
	GetOptions,
} from '@probot/octokit-plugin-config/dist-types/types.d.js'

import {
	ReleaseDrafterMajorMinorPatch,
	SORT_BY,
	SORT_DIRECTIONS,
} from './default-config.js'

export type PullRequest = {
	mergedAt: string
	title: string
	baseRefName: string
	headRefName: string
	url: string
	body: string
	number: number
	author?: {
		login?: string
	}
	labels: {
		nodes: {
			name: string
		}
	}
}

export type ReleaseDrafterLabels = {
	labels: string[]
}

export type ReleaseDrafterVersionResolver = {
	default: ReleaseDrafterMajorMinorPatch
	major: ReleaseDrafterLabels
	minor: ReleaseDrafterLabels
	patch: ReleaseDrafterLabels
}

export type ReleaseDrafterReplacer = {
	search: RegExp
	replace: string
}

export type ReleaseDrafterCategory = {
	title: string
	collapseAfter: number
	labels: string[]
}

export type ReleaseDrafterAutolabeler = {
	label: string
	files: RegExp[]
	branch: RegExp[]
	title: RegExp[]
	body: RegExp[]
}

export type ReleaseDrafterConfig = {
	autolabeler: ReleaseDrafterAutolabeler[]
	categories: ReleaseDrafterCategory[]
	categoryTemplate: string
	changeTemplate: string
	changeTitleEscapes: string
	commitish: string
	excludeContributors: string[]
	excludeLabels: string[]
	filterByCommitish: boolean
	footer: string
	header: string
	includeLabels: string[]
	includePaths: string[]
	nameTemplate: string
	noChangesTemplate: string
	noContributorsTemplate: string
	prerelease: boolean
	references: string[]
	replacers: ReleaseDrafterReplacer[]
	sortBy: SORT_BY
	sortDirection: SORT_DIRECTIONS
	tagPrefix: string
	tagTemplate: string
	template: string
	versionResolver: ReleaseDrafterVersionResolver
	versionTemplate: string
}

export type ReleaseDrafterGetOptions = GetOptions<
	ReleaseDrafterConfig & Configuration
>
