import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { gitRootSync } from '@antongolub/git-root'
import { jsonSchema } from './json-schema.js'

const directory = path.dirname(url.fileURLToPath(import.meta.url))
const root = gitRootSync(directory) ?? ''

const schemaPath = path.join(root.toString(), 'schema.json')

fs.writeFileSync(schemaPath, `${JSON.stringify(jsonSchema, undefined, '\t')}\n`)
