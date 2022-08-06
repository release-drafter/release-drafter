import { zodToJsonSchema } from 'zod-to-json-schema'
import { schema } from '@release-drafter/core'
import { z } from 'zod'

/**
 * Add _extends to the schema which is coming from octokit config plugin
 */
function convertSchema() {
	// noinspection TypeScriptValidateJSTypes
	const zodSchema = schema().merge(
		z.object({
			_extends: z.string().optional(),
		}),
	)
	return zodToJsonSchema(zodSchema, 'ReleaseDrafter')
}

export const jsonSchema = {
	title: 'JSON schema for Release Drafter yaml files',
	$id: 'https://raw.githubusercontent.com/release-drafter/release-drafter/master/schema.json',
	...convertSchema(),
}
