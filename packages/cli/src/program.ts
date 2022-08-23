import { Command, Option } from 'commander'
import { EOL } from 'node:os'
import { URL } from 'node:url'
import { Options } from './types.js'
import { ReleaseDrafterConfig } from '@release-drafter/core'

export enum ExitCode {
	Success = 0,
	Failure = 1,
}

export const program = new Command()
	.description('Create a release, will draft by default')
	.addOption(
		new Option(
			'-r, --repository <repository>',
			'GitHub repository in the format <owner>/<repo>',
		)
			.env('GITHUB_REPOSITORY')
			.makeOptionMandatory(),
	)
	.addOption(
		new Option(
			'--reference <reference>',
			'GitHub reference to generate change log from',
		).env('GITHUB_REF'),
	)
	.option('--default-branch <branch>', 'Default branch to fetch config from')
	.option('--prerelease', 'Create a prerelease')
	.option('--publish', 'Publish the release')
	.addOption(
		new Option('--version <version>', 'Version for the release').env(
			'INPUT_VERSION',
		),
	)
	.addOption(new Option('--tag <tag>', 'Tag for the release').env('INPUT_TAG'))
	.addOption(
		new Option('--name <name>', 'Name for the release').env('INPUT_NAME'),
	)
	.option(
		'-c, --config <config>',
		'Path to the config file, it will be merged with the repository config',
	)
	.option(
		'--config-name <config-name>',
		'Name of the config file to look for in the repository',
		'release-drafter.yml',
	)
	.option(
		'--no-fetch-config',
		'Do not fetch the config file from the repository',
	)
	.addOption(
		new Option('--commitish <commitish>', 'target commitish for release').env(
			'INPUT_COMMITISH',
		),
	)
	.addOption(
		new Option('--header <header>', 'Header of the release draft').env(
			'INPUT_HEADER',
		),
	)
	.addOption(
		new Option('--footer <footer>', 'Footer of the release draft').env(
			'INPUT_FOOTER',
		),
	)
	.parse()

export function info(message: string) {
	process.stdout.write(message + EOL)
}

export function error(message: string) {
	process.stderr.write(message + EOL)
}

export function getRepo(repository: string) {
	if (repository.startsWith('https://')) {
		repository = new URL(repository).pathname.slice(1)
	}
	const [owner, repo] = repository.split('/', 2)
	return { owner, repo }
}

export function mergeOptionsAndConfig(
	options: Options,
	config: ReleaseDrafterConfig,
) {
	// Merges the config file with the input which takes precedence
	const preRelease = options.prerelease

	const header = options.header
	const footer = options.footer
	if (header) {
		config.header = header
	}
	if (footer) {
		config.footer = footer
	}

	return {
		isPreRelease: preRelease || (!preRelease && config.prerelease),
		shouldDraft: !options.publish,
		version: options.version || undefined,
		tag: options.tag || undefined,
		name: options.name || undefined,
		commitish: options.commitish || undefined,
	}
}
