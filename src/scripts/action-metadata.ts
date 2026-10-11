import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDocument } from 'yaml'
import { actionManifests } from './action-metadata-config.ts'

for (const metadata of Object.values(actionManifests)) {
  for (const path of metadata.paths) {
    const templatePath = join('src/scripts/action-metadata', path)
    const source = readFileSync(templatePath, 'utf8')
    const document = parseDocument(source)
    if (document.errors.length > 0) {
      throw new Error(
        `Cannot generate invalid Action metadata from ${templatePath}`,
        {
          cause: document.errors[0],
        },
      )
    }
    document.set('inputs', metadata.inputs)
    document.set('outputs', metadata.outputs)
    const generated = document.toString({
      blockQuote: 'literal',
      lineWidth: 0,
      singleQuote: true,
    })
    if (!existsSync(path) || generated !== readFileSync(path, 'utf8')) {
      writeFileSync(path, generated)
      console.log(`Updated ${path}`)
    }
  }
}
