import { promises as fs } from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import prettier from 'prettier'
import { gitRootSync } from '@antongolub/git-root'
import { jsonSchema } from './json-schema.js'

const directory = path.dirname(url.fileURLToPath(import.meta.url))
const root = gitRootSync(directory)?.toString() ?? ''

const schemaPath = path.join(root, 'schema.json')
const prettierConfig = await prettier.resolveConfig(root)

const content = prettier.format(JSON.stringify(jsonSchema), {
	...prettierConfig,
	filepath: schemaPath,
})

await fs.writeFile(schemaPath, content)
