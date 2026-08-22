import { readFileSync, writeFileSync } from 'node:fs'
import { stringify } from 'yaml'
import {
  type ActionParameterMetadata,
  actionManifests,
} from './action-metadata-config.ts'

type ActionMetadata = Record<string, ActionParameterMetadata>

const replaceMapping = (
  source: string,
  name: 'inputs' | 'outputs',
  metadata: ActionMetadata,
): string => {
  const lines = source.split('\n')
  const start = lines.indexOf(`${name}:`)
  const generated = stringify(
    { [name]: metadata },
    { blockQuote: 'literal', lineWidth: 0, singleQuote: true },
  )
    .trimEnd()
    .split('\n')

  if (start === -1) {
    const separator = source.endsWith('\n\n') ? '' : '\n'
    return `${source.trimEnd()}${separator}\n${generated.join('\n')}\n`
  }

  const nextMapping = lines.findIndex(
    (line, index) => index > start && /^[^\s#][^:]*:/u.test(line),
  )
  const end = nextMapping === -1 ? lines.length : nextMapping
  const suffix = lines.slice(end)
  const replacement = [...lines.slice(0, start), ...generated]
  if (suffix.length > 0) replacement.push('', ...suffix)

  return `${replacement.join('\n').trimEnd()}\n`
}

for (const metadata of Object.values(actionManifests)) {
  for (const path of metadata.paths) {
    const source = readFileSync(path, 'utf8')
    const withInputs = replaceMapping(source, 'inputs', metadata.inputs)
    const generated = replaceMapping(withInputs, 'outputs', metadata.outputs)
    if (generated !== source) {
      writeFileSync(path, generated)
      console.log(`Updated ${path}`)
    }
  }
}
