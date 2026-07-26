#!/usr/bin/env node

import cac from 'cac'
import { consola } from 'consola'
import packageJson from '../../package.json' with { type: 'json' }
import { draftRelease } from './draft-release.ts'

type BooleanOption = boolean | string | undefined

type CliOptions = {
  from?: string
  releaseVersion?: string
  to?: string
  config: string
  dryRun: boolean
  json: boolean
  publish?: BooleanOption
  prerelease?: BooleanOption
  latest?: BooleanOption
}

const parseBooleanOption = (name: string, value: BooleanOption) => {
  if (value === undefined) return undefined
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new Error(`--${name} must be true or false`)
}

const cli = cac('release-drafter')

cli
  .command('<repository>', '✍️ Create, update, or publish a GitHub release')
  .option('-f, --from <commitish>', 'Override the previous release')
  .option(
    '-r, --release-version <version>',
    'Override the resolved release version',
  )
  .option(
    '-t, --to <commitish>',
    'Target commitish (defaults to the repository default branch)',
  )
  .option('-c, --config <target>', 'Config target or github.com blob URL', {
    default: 'release-drafter.yml',
  })
  .option(
    '--dry-run',
    'Build and print the release without writing to GitHub',
    {
      default: false,
    },
  )
  .option(
    '--publish [boolean]',
    'Publish the release instead of leaving a draft',
  )
  .option('--prerelease [boolean]', 'Mark the release as a prerelease')
  .option('--latest [boolean]', 'Mark the published release as latest')
  .option('--json', 'Output release variables as JSON', { default: false })
  .action(async (repository: string, options: CliOptions) => {
    await draftRelease({
      repository,
      from: options.from,
      version: options.releaseVersion,
      to: options.to,
      config: options.config,
      dryRun: options.dryRun,
      json: options.json,
      publish: parseBooleanOption('publish', options.publish),
      prerelease: parseBooleanOption('prerelease', options.prerelease),
      latest: parseBooleanOption('latest', options.latest),
    })
  })

cli.help()
cli.version(packageJson.version)
cli.parse(process.argv, { run: false })

try {
  await cli.runMatchedCommand()
} catch (error) {
  consola.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
