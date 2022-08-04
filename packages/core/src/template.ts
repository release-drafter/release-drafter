import { Replacer } from './types.js'

/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */

export function template(
	string: string,
	object: Record<string, unknown>,
	customReplacers?: Replacer[],
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
