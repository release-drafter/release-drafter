import {
	Configuration,
	GetOptions,
} from '@probot/octokit-plugin-config/dist-types/types.d.js'
import { ReleaseType, SemVer } from 'semver'

import { MajorMinorPatch, SORT_BY, SORT_DIRECTIONS } from './enums.js'
import { Context } from './context.js'

export type Label = {
	name: string
}

export type PullRequest = {
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
		nodes: Label[]
	}
}

export type CommitWithAssociatedPullRequests = {
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
		nodes: PullRequest[]
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

export type ReleaseDrafterContext = InstanceType<typeof Context>

export type Replacer = {
	search: RegExp
	replace: string
}

export type ReleaseDrafterCategory = {
	title?: string
	'collapse-after': number
	labels: string[]
}

export type ReleaseDrafterCategorizedPullRequest = {
	title?: string
	'collapse-after': number
	labels: string[]
	pullRequests: PullRequest[]
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
	id: number
	created_at: string
	target_commitish: string
	draft: boolean
}

export type ReleaseDrafterConfig = {
	autolabeler: Autolabeler[]
	categories: ReleaseDrafterCategory[]
	'category-template': string
	'change-template': string
	'change-title-escapes': string
	commitish: string
	'exclude-contributors': string[]
	'exclude-labels': string[]
	'filter-by-commitish': boolean
	footer: string
	header: string
	'include-labels': string[]
	'include-paths': string[]
	'name-template': string
	'no-changes-template': string
	'no-contributors-template': string
	prerelease: boolean
	references: string[]
	replacers: Replacer[]
	'sort-by': SORT_BY
	'sort-direction': SORT_DIRECTIONS
	'tag-prefix': string
	'tag-template': string
	template: string
	'version-resolver': VersionResolver
	'version-template': string
}

export type ReleaseDrafterGetOptions = GetOptions<
	ReleaseDrafterConfig & Configuration
>

export type VersionTemplate = {
	$MAJOR: number
	$MINOR: number
	$PATCH: number
	inc?: ReleaseType
	version: string
	template: string
	versionInput?: SemVer
}

export type VersionInfo = {
	$NEXT_MAJOR_VERSION?: VersionTemplate
	$NEXT_MINOR_VERSION?: VersionTemplate
	$NEXT_PATCH_VERSION?: VersionTemplate
	$NEXT_MAJOR_VERSION_MAJOR?: VersionTemplate
	$NEXT_MAJOR_VERSION_MINOR?: VersionTemplate
	$NEXT_MAJOR_VERSION_PATCH?: VersionTemplate
	$NEXT_MINOR_VERSION_MAJOR?: VersionTemplate
	$NEXT_MINOR_VERSION_MINOR?: VersionTemplate
	$NEXT_MINOR_VERSION_PATCH?: VersionTemplate
	$NEXT_PATCH_VERSION_MAJOR?: VersionTemplate
	$NEXT_PATCH_VERSION_MINOR?: VersionTemplate
	$NEXT_PATCH_VERSION_PATCH?: VersionTemplate
	$INPUT_VERSION?: VersionTemplate
	$RESOLVED_VERSION?: VersionTemplate
}
