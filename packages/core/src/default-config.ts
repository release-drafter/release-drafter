import { ReleaseDrafterConfig } from './types.js'

export enum ReleaseDrafterMajorMinorPatch {
	Major = 'major',
	Minor = 'minor',
	Patch = 'patch',
}

export const enum SORT_BY {
	mergedAt = 'merged_at',
	title = 'title',
}

export const enum SORT_DIRECTIONS {
	ascending = 'ascending',
	descending = 'descending',
}

export const DEFAULT_CONFIG: ReleaseDrafterConfig = Object.freeze({
	autolabeler: [],
	categories: [],
	categoryTemplate: `## $TITLE`,
	changeTemplate: `* $TITLE (#$NUMBER) @$AUTHOR`,
	changeTitleEscapes: '',
	commitish: '',
	excludeContributors: [],
	excludeLabels: [],
	filterByCommitish: false,
	footer: '',
	header: '',
	includeLabels: [],
	includePaths: [],
	nameTemplate: '',
	noChangesTemplate: `* No changes`,
	noContributorsTemplate: 'No contributors',
	prerelease: false,
	references: ['master'],
	replacers: [],
	sortBy: SORT_BY.mergedAt,
	sortDirection: SORT_DIRECTIONS.descending,
	tagPrefix: '',
	tagTemplate: '',
	template: `## What’s Changed\n\n$CHANGES`,
	versionTemplate: `$MAJOR.$MINOR.$PATCH`,
	versionResolver: {
		major: { labels: [] },
		minor: { labels: [] },
		patch: { labels: [] },
		default: ReleaseDrafterMajorMinorPatch.Patch,
	},
})
