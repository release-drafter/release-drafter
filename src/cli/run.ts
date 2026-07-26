#!/usr/bin/env node

import cac from 'cac'
import { consola } from 'consola'
import packageJson from '../../package.json' with { type: 'json' }
import { draftRelease } from './draft-release.ts'

type CliOptions = {
  from?: string
  releaseVersion?: string
  to?: string
  config: string
  dryRun: boolean
}

const cli = cac('release-drafter')

cli
  .command('<repository>', '✍️ Create or update a GitHub release draft')
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
  .option('--dry-run', 'Build and print the release without creating it', {
    default: false,
  })
  .action(async (repository: string, options: CliOptions) => {
    await draftRelease({
      repository,
      from: options.from,
      version: options.releaseVersion,
      to: options.to,
      config: options.config,
      dryRun: options.dryRun,
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
