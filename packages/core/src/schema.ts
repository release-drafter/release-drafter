import { Context } from './context.js'

import Joi from 'joi'
import { DEFAULT_CONFIG, SORT_BY, SORT_DIRECTIONS } from './default-config.js'
import {
	validateReplacers,
	validateAutolabeler,
	validateCategories,
} from './template.js'
import merge from 'deepmerge'
import { ReleaseDrafterConfig } from './types.js'

const renames = [
	{ from: 'branches', to: 'references' },
	{ from: 'change-template', to: 'cangeTemplate' },
	{ from: 'change-title-escapes', to: 'changeTitleEscapes' },
	{ from: 'no-changes-template', to: 'noChangesTemplate' },
	{ from: 'version-template', to: 'versionTemplate' },
	{ from: 'name-template', to: 'nameTemplate' },
	{ from: 'tag-prefix', to: 'tagPrefix' },
	{ from: 'tag-template', to: 'tagTemplate' },
	{ from: 'exclude-labels', to: 'excludeLabels' },
	{ from: 'include-labels', to: 'includeLabels' },
	{ from: 'include-paths', to: 'includePaths' },
	{ from: 'exclude-contributors', to: 'excludeContributors' },
	{ from: 'no-contributors-template', to: 'noContributorsTemplate' },
	{ from: 'sort-by', to: 'sortBy' },
	{ from: 'sort-direction', to: 'sortDirection' },
	{ from: 'filter-by-commitish', to: 'filterByCommitish' },
	{ from: 'collapse-after', to: 'collapseAfter' },
	{ from: 'version-resolver', to: 'versionResolver' },
	{ from: 'category-template', to: 'categoryTemplate' },
]

export function schema(defaultBranch = 'master') {
	const joiObject = Joi.object<
		ReleaseDrafterConfig & { _extends: string },
		true
	>().keys({
		references: Joi.array().items(Joi.string()).default([defaultBranch]),

		changeTemplate: Joi.string().default(DEFAULT_CONFIG.changeTemplate),

		changeTitleEscapes: Joi.string()
			.allow('')
			.default(DEFAULT_CONFIG.changeTitleEscapes),

		noChangesTemplate: Joi.string().default(DEFAULT_CONFIG.noChangesTemplate),

		versionTemplate: Joi.string().default(DEFAULT_CONFIG.versionTemplate),

		nameTemplate: Joi.string().allow('').default(DEFAULT_CONFIG.nameTemplate),

		tagPrefix: Joi.string().allow('').default(DEFAULT_CONFIG.tagPrefix),

		tagTemplate: Joi.string().allow('').default(DEFAULT_CONFIG.tagTemplate),

		excludeLabels: Joi.array()
			.items(Joi.string())
			.default(DEFAULT_CONFIG.excludeLabels),

		includeLabels: Joi.array()
			.items(Joi.string())
			.default(DEFAULT_CONFIG.includeLabels),

		includePaths: Joi.array()
			.items(Joi.string())
			.default(DEFAULT_CONFIG.includePaths),

		excludeContributors: Joi.array()
			.items(Joi.string())
			.default(DEFAULT_CONFIG.excludeContributors),

		noContributorsTemplate: Joi.string().default(
			DEFAULT_CONFIG.noContributorsTemplate,
		),

		sortBy: Joi.string()
			.valid(SORT_BY.mergedAt, SORT_BY.title)
			.default(DEFAULT_CONFIG.sortBy),

		sortDirection: Joi.string()
			.valid(SORT_DIRECTIONS.ascending, SORT_DIRECTIONS.descending)
			.default(DEFAULT_CONFIG.sortDirection),

		prerelease: Joi.boolean().default(DEFAULT_CONFIG.prerelease),

		filterByCommitish: Joi.boolean().default(DEFAULT_CONFIG.filterByCommitish),

		commitish: Joi.string().allow('').default(DEFAULT_CONFIG.commitish),

		replacers: Joi.array()
			.items(
				Joi.object().keys({
					search: Joi.string()
						.required()
						.error(
							new Error(
								'"search" is required and must be a regexp or a string',
							),
						),
					replace: Joi.string().allow('').required(),
				}),
			)
			.default(DEFAULT_CONFIG.replacers),

		autolabeler: Joi.array()
			.items(
				Joi.object().keys({
					label: Joi.string().required(),
					files: Joi.array().items(Joi.string()).single().default([]),
					branch: Joi.array().items(Joi.string()).single().default([]),
					title: Joi.array().items(Joi.string()).single().default([]),
					body: Joi.array().items(Joi.string()).single().default([]),
				}),
			)
			.default(DEFAULT_CONFIG.autolabeler),

		categories: Joi.array()
			.items(
				Joi.object()
					.keys({
						title: Joi.string().required(),
						collapseAfter: Joi.number().integer().min(0).default(0),
						label: Joi.string(),
						labels: Joi.array().items(Joi.string()).single().default([]),
					})
					.rename('label', 'labels', {
						ignoreUndefined: true,
						override: true,
					}),
			)
			.default(DEFAULT_CONFIG.categories),

		versionResolver: Joi.object()
			.keys({
				major: Joi.object({
					labels: Joi.array()
						.items(Joi.string())
						.single()
						.default(DEFAULT_CONFIG.versionResolver.major.labels),
				}),
				minor: Joi.object({
					labels: Joi.array()
						.items(Joi.string())
						.single()
						.default(DEFAULT_CONFIG.versionResolver.minor.labels),
				}),
				patch: Joi.object({
					labels: Joi.array()
						.items(Joi.string())
						.single()
						.default(DEFAULT_CONFIG.versionResolver.patch.labels),
				}),
				default: Joi.string().valid('major', 'minor', 'patch').default('patch'),
			})
			.default(DEFAULT_CONFIG.versionResolver),

		categoryTemplate: Joi.string()
			.allow('')
			.default(DEFAULT_CONFIG.categoryTemplate),

		header: Joi.string().allow('').default(DEFAULT_CONFIG.header),

		template: Joi.string().required(),

		footer: Joi.string().allow('').default(DEFAULT_CONFIG.footer),

		_extends: Joi.string(),
	})

	for (const rename of renames) {
		joiObject.rename(rename.from, rename.to, {
			ignoreUndefined: true,
			override: true,
		})
	}
	return joiObject
}

export function validateSchema(
	context: Context,
	repoConfig: ReleaseDrafterConfig,
): ReleaseDrafterConfig {
	const mergedRepoConfig = merge.all([DEFAULT_CONFIG, repoConfig])
	const { error, value: config } = schema(context.defaultBranch).validate(
		mergedRepoConfig,
		{
			abortEarly: false,
			allowUnknown: true,
		},
	)

	if (error) throw error

	validateCategories(config.categories)

	if (config.replacers.length > 0) {
		config.replacers = validateReplacers(config.replacers)
	}

	if (config.autolabeler.length > 0) {
		config.autolabeler = validateAutolabeler(config.autolabeler)
	}

	return config
}
