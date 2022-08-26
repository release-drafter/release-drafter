import {
	Context,
	createRelease,
	findCommitsWithAssociatedPullRequests,
	findReleases,
	generateReleaseInfo,
	getOctokit,
	sortPullRequests,
	updateRelease,
} from '@release-drafter/core'
import { Options } from './types.js'
import { getDefaultBranch } from './github.js'
import {
	error,
	ExitCode,
	getRepo,
	info,
	mergeOptionsAndConfig,
	program,
} from './program.js'

export async function cli(): Promise<void> {
	const options = program.opts<Options>()
	const GITHUB_TOKEN = process.env.GITHUB_TOKEN
	if (!GITHUB_TOKEN) {
		error('⛔ No GitHub token found')
		process.exitCode = ExitCode.Failure
		return
	}

	const { owner, repo } = getRepo(options.repository)
	info(`🎉 Running Release Drafter CLI for ${owner}/${repo}`)
	const configName = options.configName

	const octokit = getOctokit(GITHUB_TOKEN)
	const defaultBranch = await getDefaultBranch(octokit, {
		owner,
		repo,
		defaultBranchFromOption: options.defaultBranch,
	})
	const context = new Context(octokit, defaultBranch, {
		owner,
		repo,
		configName,
	})

	info('⏬ Fetching config')
	const config = await context.config()

	const { isPreRelease, shouldDraft, version, tag, name, commitish } =
		mergeOptionsAndConfig(options, config)

	const { filterByCommitish, tagPrefix, sortBy, sortDirection } = config
	const targetCommitish =
		commitish || config.commitish || options.reference || defaultBranch

	if (targetCommitish.startsWith('refs/tags')) {
		info(
			`⚠ target commitish of '${targetCommitish}' is not supported as release target, falling back to default branch '${defaultBranch}'`,
		)
	}

	info('⏬ Fetching releases')

	const { draftRelease, lastRelease } = await findReleases({
		context,
		targetCommitish,
		filterByCommitish,
		tagPrefix,
	})

	if (draftRelease) {
		info(`🎯 Found existing draft release ${draftRelease.tag_name}`)
	} else {
		info('⛔ No existing draft release found')
	}

	if (lastRelease) {
		info(`🎯 Found previous release ${lastRelease.tag_name}`)
		info(
			`⏬ Fetching parent commits of ${targetCommitish} since ${lastRelease.created_at}`,
		)
	} else {
		info('⛔ No previous release found')
		info(`⏬ Fetching parent commits of ${targetCommitish}`)
	}

	const { commits, pullRequests } = await findCommitsWithAssociatedPullRequests(
		{
			context,
			targetCommitish,
			lastRelease,
			config,
		},
	)
	info(`👏 Found ${pullRequests.length} pull requests`)

	info(`📚 Sorting pull requests`)
	const sortedPullRequests = sortPullRequests(
		pullRequests,
		sortBy,
		sortDirection,
	)

	const releaseInfo = await generateReleaseInfo({
		context,
		commits,
		config,
		lastRelease,
		pullRequests: sortedPullRequests,
		version,
		tag,
		name,
		isPreRelease,
		shouldDraft,
		targetCommitish,
	})

	let createOrUpdateReleaseResponse
	if (draftRelease) {
		info(`🔃 Updating existing release ${draftRelease.id}`)
		createOrUpdateReleaseResponse = await updateRelease({
			context,
			releaseInfo,
			draftRelease,
		})
		info(`✔ Updated release ${createOrUpdateReleaseResponse.data.html_url}`)
	} else {
		info('🆕 Creating new release')
		createOrUpdateReleaseResponse = await createRelease({
			context,
			releaseInfo,
		})
		info(`✔ Created release ${createOrUpdateReleaseResponse.data.html_url}`)
	}

	process.exitCode = ExitCode.Success
}
