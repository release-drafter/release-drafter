import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'

type LicenseEntry = { text?: unknown }
type LicenseRecord = {
  licenses?: unknown
  name?: unknown
  notices?: unknown
  version?: unknown
}
type PackageLock = {
  packages?: Record<string, { version?: unknown }>
}

const repositoryRoot = resolve(import.meta.dirname, '../..')
const packageDirectory = join(repositoryRoot, 'packages/release-drafter')
const separator = '='.repeat(79)

export const bundledDependencies = [
  'balanced-match',
  'brace-expansion',
  'compare-versions',
  'conventional-commits-parser',
  'escape-string-regexp',
  'minimatch',
  'verkit',
  'yaml',
  'zod',
] as const

const packageLock = JSON.parse(
  readFileSync(join(repositoryRoot, 'package-lock.json'), 'utf8'),
) as PackageLock

const sections = bundledDependencies.map((dependency) => {
  const lockedVersion =
    packageLock.packages?.[`node_modules/${dependency}`]?.version
  if (typeof lockedVersion !== 'string') {
    throw new Error(
      `Cannot find bundled dependency ${dependency} in package-lock.json`,
    )
  }

  const cachePath = join(
    repositoryRoot,
    '.licenses/npm',
    `${dependency}.dep.yml`,
  )
  const record = parseYaml(readFileSync(cachePath, 'utf8')) as LicenseRecord
  if (record.name !== dependency || record.version !== lockedVersion) {
    throw new Error(
      `Cached license for ${dependency} does not match package-lock.json (${String(record.version)} != ${lockedVersion})`,
    )
  }
  if (!Array.isArray(record.licenses) || record.licenses.length === 0) {
    throw new Error(`Cached license for ${dependency} has no license text`)
  }

  const licenseTexts = record.licenses.map((license: LicenseEntry) => {
    if (typeof license.text !== 'string' || !license.text.trim()) {
      throw new Error(`Cached license for ${dependency} has blank license text`)
    }
    return license.text.trimEnd()
  })
  const notices = Array.isArray(record.notices)
    ? record.notices.filter(
        (notice): notice is string => typeof notice === 'string' && !!notice,
      )
    : []

  return [
    separator,
    dependency,
    separator,
    '',
    ...licenseTexts,
    ...notices,
  ].join('\n')
})

const output = [
  'Release Drafter includes code from the packages listed below.',
  'This file is generated from the repository license cache.',
  '',
  sections.join('\n\n'),
  '',
].join('\n')
const outputPath = join(packageDirectory, 'THIRD_PARTY_NOTICES')

const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : ''
if (existing !== output) writeFileSync(outputPath, output)
