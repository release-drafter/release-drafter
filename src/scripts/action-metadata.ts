import { readFileSync, writeFileSync } from 'node:fs'
import { parseDocument } from 'yaml'
import { actionManifests } from './action-metadata-config.ts'

for (const metadata of Object.values(actionManifests)) {
  for (const path of metadata.paths) {
    const source = readFileSync(path, 'utf8')
    const document = parseDocument(source)
    if (document.errors.length > 0) {
      throw new Error(`Cannot update invalid Action metadata at ${path}`, {
        cause: document.errors[0],
      })
    }
    document.set('inputs', metadata.inputs)
    document.set('outputs', metadata.outputs)
    const generated = document.toString({
      blockQuote: 'literal',
      lineWidth: 0,
      singleQuote: true,
    })
    if (generated !== source) {
      writeFileSync(path, generated)
      console.log(`Updated ${path}`)
    }
  }
}
