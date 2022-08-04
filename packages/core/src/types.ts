import {
	Configuration,
	GetOptions,
} from '@probot/octokit-plugin-config/dist-types/types.d.js'

import { MajorMinorPatch, SORT_BY, SORT_DIRECTIONS } from './enums.js'

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

export type Labels = {
	labels: string[]
}

export type VersionResolver = {
	default: MajorMinorPatch
	major: Labels
	minor: Labels
	patch: Labels
}

export type Replacer = {
	search: RegExp
	replace: string
}

export type ReleaseDrafterCategory = {
	title: string
	collapseAfter: number
	labels: string[]
}

export type Autolabeler = {
	label: string
	files: string[]
	branch: RegExp[]
	title: RegExp[]
	body: RegExp[]
}

export type GitHubRelease = {
	tag_name: string
	name: string
	created_at?: string
}

export type ReleaseDrafterConfig = {
	autolabeler: Autolabeler[]
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
	replacers: Replacer[]
	sortBy: SORT_BY
	sortDirection: SORT_DIRECTIONS
	tagPrefix: string
	tagTemplate: string
	template: string
	versionResolver: VersionResolver
	versionTemplate: string
}

export type ReleaseDrafterGetOptions = GetOptions<
	ReleaseDrafterConfig & Configuration
>
