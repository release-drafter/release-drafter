import fs from 'node:fs/promises'
import prettier from 'prettier'
import { jsonSchema } from './json-schema.js'
import { root, schemaPath } from './paths.js'

export async function run(): Promise<void> {
	const prettierConfig = await prettier.resolveConfig(root)

	const content = prettier.format(JSON.stringify(jsonSchema), {
		...prettierConfig,
		filepath: schemaPath,
	})

	await fs.writeFile(schemaPath, content)
}
