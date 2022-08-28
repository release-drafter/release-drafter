import { z } from 'zod'
import regexParser from 'regex-parser'
import regexEscape from 'escape-string-regexp'
import { Context } from './context.js'
import { DEFAULT_CONFIG } from './default-config.js'
import { ReleaseDrafterConfig, ReleaseDrafterCategory } from './types.js'
import { MajorMinorPatch, SORT_BY, SORT_DIRECTIONS } from './enums.js'

export function toRegex(search: string) {
	return /^\/.+\/[AJUXgimsux]*$/.test(search)
		? regexParser(search)
		: new RegExp(regexEscape(search), 'g')
}

/**
 * This is used to check if multiple categories have no labels.
 * We only allow a single category to have no labels.
 *
 * if length is greater than 1 return false
 * falsy values are meant to signal failure in zod refine validation
 */
function validateOnlyOneUncategorizedCategoryExist(
	categories: ReleaseDrafterCategory[],
) {
	const length = categories.filter(
		(category) => category.labels.length === 0,
	).length
	return length <= 1
}

export function schema(defaultBranch = 'main') {
	return z.object({
		references: z.array(z.string()).default([defaultBranch]),

		'change-template': z.string().default(DEFAULT_CONFIG['change-template']),

		'change-title-escapes': z
			.string()
			.default(DEFAULT_CONFIG['change-title-escapes']),

		'no-changes-template': z
			.string()
			.default(DEFAULT_CONFIG['no-changes-template']),

		'version-template': z.string().default(DEFAULT_CONFIG['version-template']),

		'name-template': z.string().default(DEFAULT_CONFIG['name-template']),

		'tag-prefix': z.string().default(DEFAULT_CONFIG['tag-prefix']),

		'tag-template': z.string().default(DEFAULT_CONFIG['tag-template']),

		'exclude-labels': z
			.array(z.string())
			.default(DEFAULT_CONFIG['exclude-labels']),

		'include-labels': z
			.array(z.string())
			.default(DEFAULT_CONFIG['include-labels']),

		'include-paths': z
			.array(z.string())
			.default(DEFAULT_CONFIG['include-paths']),

		'exclude-contributors': z
			.array(z.string())
			.default(DEFAULT_CONFIG['exclude-contributors']),

		'no-contributors-template': z
			.string()
			.default(DEFAULT_CONFIG['no-contributors-template']),

		'sort-by': z
			.enum([SORT_BY.mergedAt, SORT_BY.title])
			.default(DEFAULT_CONFIG['sort-by']),

		'sort-direction': z
			.enum([SORT_DIRECTIONS.ascending, SORT_DIRECTIONS.descending])
			.default(DEFAULT_CONFIG['sort-direction']),

		prerelease: z.boolean().default(DEFAULT_CONFIG.prerelease),

		'filter-by-commitish': z
			.boolean()
			.default(DEFAULT_CONFIG['filter-by-commitish']),

		commitish: z.string().default(DEFAULT_CONFIG.commitish),

		replacers: z
			.array(
				z.object({
					search: z.string().transform((value) => toRegex(value)),
					replace: z.string().or(z.literal('')),
				}),
			)
			.default([]),

		autolabeler: z
			.array(
				z.object({
					label: z.string(),
					files: z.array(z.string()).default([]),
					branch: z
						.array(z.string().transform((value) => toRegex(value)))
						.default([]),
					title: z
						.array(z.string().transform((value) => toRegex(value)))
						.default([]),
					body: z
						.array(z.string().transform((value) => toRegex(value)))
						.default([]),
				}),
			)
			.default([]),

		categories: z
			.array(
				z.object({
					title: z.string(),
					'collapse-after': z.number().nonnegative().default(0),
					labels: z.array(z.string()).default([]),
				}),
			)
			.default([])
			.refine(
				(categories) => validateOnlyOneUncategorizedCategoryExist(categories),
				{
					message:
						'Multiple categories detected with no labels.\nOnly one category with no labels is supported for uncategorized pull requests.',
				},
			),

		'version-resolver': z
			.object({
				major: z.object({
					labels: z.array(z.string()).default([]),
				}),
				minor: z.object({
					labels: z.array(z.string()).default([]),
				}),
				patch: z.object({
					labels: z.array(z.string()).default([]),
				}),
				default: z
					.enum([
						MajorMinorPatch.major,
						MajorMinorPatch.minor,
						MajorMinorPatch.patch,
					])
					.default(MajorMinorPatch.patch),
			})
			.default(DEFAULT_CONFIG['version-resolver']),

		'category-template': z
			.string()
			.default(DEFAULT_CONFIG['category-template']),

		header: z.string().default(DEFAULT_CONFIG.header),

		template: z.string().min(1).default(DEFAULT_CONFIG.template),

		footer: z.string().default(DEFAULT_CONFIG.footer),
	})
}

export function validateSchema(
	context: Context,
	repoConfig: ReleaseDrafterConfig,
): ReleaseDrafterConfig {
	return schema(context.defaultBranch).parse(repoConfig)
}
