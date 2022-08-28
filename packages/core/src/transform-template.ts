import { Replacer, VersionTemplate } from './types.js'
import { z } from 'zod'

/**
 * replaces all uppercase dollar templates with their string representation from objectReplacer
 * if replacement is undefined in objectReplacer the dollar template string is left untouched
 */

const templateReplacer = z.object({ template: z.string() }).passthrough()

export function transformTemplate(
	input: string,
	objectReplacer: {
		[x: string]: string | number | undefined | VersionTemplate
	},
	customReplacers?: Replacer[],
): string {
	let output: string = input.replace(/(\$[A-Z_]+)/g, (_, k) => {
		if (!(k in objectReplacer)) {
			return k
		}

		const replacer = templateReplacer.safeParse(objectReplacer[k])
		if (replacer.success) {
			return transformTemplate(replacer.data.template, replacer.data)
		}

		return objectReplacer[k]
	})
	if (customReplacers) {
		for (const { search, replace } of customReplacers) {
			output = output.replace(search, replace)
		}
	}
	return output
}
