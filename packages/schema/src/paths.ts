import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitRootSync } from '@antongolub/git-root'

const directory = path.dirname(fileURLToPath(import.meta.url))
export const root = gitRootSync(directory)?.toString() as string
export const schemaPath = path.join(root, 'schema.json')
