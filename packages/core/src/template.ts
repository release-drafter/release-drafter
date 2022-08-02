import {
	ReleaseDrafterAutolabeler,
	ReleaseDrafterAutolabelerStrings,
	ReleaseDrafterCategory,
	ReleaseDrafterReplacer,
	ReleaseDrafterReplacerStrings,
} from './types.js'
import regexParser from 'regex-parser'
import regexEscape from 'escape-string-regexp'

/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */

export function template(
	string: string,
	object: Record<string, unknown>,
	customReplacers?: ReleaseDrafterReplacer[],
): string {
	let input: string = string.replace(/(\$[A-Z_]+)/g, (_, k) => {
		let result: string
		if (object[k] === undefined || object[k] === null) {
			result = k
		} else if (typeof object[k] === 'object') {
			result = template(
				((object[k] as Record<string, unknown>)?.template as string) ?? '',
				object[k] as Record<string, unknown>,
			)
		} else {
			result = `${object[k]}`
		}
		return result
	})
	if (customReplacers) {
		for (const { search, replace } of customReplacers) {
			input = input.replace(search, replace)
		}
	}
	return input
}

function toRegex(search: string) {
	return /^\/.+\/[AJUXgimsux]*$/.test(search)
		? regexParser(search)
		: new RegExp(regexEscape(search), 'g')
}

export function validateReplacers(
	replacers: ReleaseDrafterReplacerStrings[],
): ReleaseDrafterReplacer[] {
	return replacers
		.map((replacer) => {
			try {
				return {
					...replacer,
					search: toRegex(replacer.search),
				}
			} catch {
				throw new Error(
					`Invalid regex in replacer: ${JSON.stringify(
						replacer,
						undefined,
						2,
					)}`,
				)
			}
		})
		.filter(Boolean)
}

export function validateAutolabeler(
	autolabeler: ReleaseDrafterAutolabelerStrings[],
): ReleaseDrafterAutolabeler[] {
	return autolabeler
		.map((autolabel) => {
			try {
				return {
					...autolabel,
					branch: autolabel.branch.map((reg) => {
						return toRegex(reg)
					}),
					title: autolabel.title.map((reg) => {
						return toRegex(reg)
					}),
					body: autolabel.body.map((reg) => {
						return toRegex(reg)
					}),
				}
			} catch {
				throw new Error(
					`Invalid regex in autolabeler: ${JSON.stringify(
						autolabel,
						undefined,
						2,
					)}`,
				)
			}
		})
		.filter(Boolean)
}

export function validateCategories(categories: ReleaseDrafterCategory[]) {
	if (
		categories.filter((category) => category.labels.length === 0).length > 1
	) {
		throw new Error(
			'Multiple categories detected with no labels.\nOnly one category with no labels is supported for uncategorized pull requests.',
		)
	}
}
