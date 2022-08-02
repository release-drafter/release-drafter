import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { jsonSchema } from './json-schema.js'

const directory = path.dirname(url.fileURLToPath(import.meta.url))
const schemaPath = path.join(directory, '../../..', 'schema.json')

fs.writeFileSync(schemaPath, `${JSON.stringify(jsonSchema, undefined, '\t')}\n`)
