import core from '@actions/core'
import {
	Context,
	createRelease,
	findCommitsWithAssociatedPullRequests,
	findReleases,
	generateReleaseInfo,
	sortPullRequests,
	updateRelease,
} from '@release-drafter/core'
import {
	getActionInputs,
	getDefaultBranch,
	getReference,
	getRepo,
	ReleaseDrafterOctokit,
	setActionOutputs,
} from './github.js'

export async function run(): Promise<void> {
	core.info('🎉 Running Release Drafter Action')

	const octokit = new ReleaseDrafterOctokit({ auth: core.getInput('token') })
	const GITHUB_REF = await getReference()
	const defaultBranch = await getDefaultBranch(octokit)
	const repo = await getRepo()

	const configName = core.getInput('config-name')
	const context = new Context(octokit, defaultBranch, { ...repo, configName })

	const config = await context.config()
	const { isPreRelease, shouldDraft, version, tag, name, commitish } =
		getActionInputs(config)

	const { filterByCommitish, tagPrefix, sortBy, sortDirection } = config
	const targetCommitish = commitish || config.commitish || GITHUB_REF
	if (targetCommitish.startsWith('refs/tags')) {
		core.info(
			`⚠ target commitish of '${targetCommitish}' is not supported as release target, falling back to default branch '${defaultBranch}'`,
		)
	}

	core.info('🗃 Fetching releases')

	const { draftRelease, lastRelease } = await findReleases({
		context,
		targetCommitish,
		filterByCommitish,
		tagPrefix,
	})

	if (draftRelease) {
		core.info(`🎯 Found existing draft release ${draftRelease.tag_name}`)
	} else {
		core.info('⛔ No existing draft release found')
	}

	if (lastRelease) {
		core.info(`🎯 Found previous release ${lastRelease.tag_name}`)
		core.info(
			`🗃 Fetching parent commits of ${targetCommitish} since ${lastRelease.created_at}`,
		)
	} else {
		core.info('⛔ No previous release found')
		core.info(`🗃 Fetching parent commits of ${targetCommitish}`)
	}

	const { commits, pullRequests } = await findCommitsWithAssociatedPullRequests(
		{
			context,
			targetCommitish,
			lastRelease,
			config,
		},
	)
	core.info(`👏 Found ${pullRequests.length} pull requests`)

	core.info(`📚 Sorting pull requests`)
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
		core.info(`🔃 Updating existing release ${draftRelease.id}`)
		createOrUpdateReleaseResponse = await updateRelease({
			context,
			releaseInfo,
			draftRelease,
		})
		core.info(
			`✔ Updated release ${createOrUpdateReleaseResponse.data.html_url}`,
		)
	} else {
		core.info('🆕 Creating new release')
		createOrUpdateReleaseResponse = await createRelease({
			context,
			releaseInfo,
		})
		core.info(
			`✔ Created release ${createOrUpdateReleaseResponse.data.html_url}`,
		)
	}

	await setActionOutputs(
		createOrUpdateReleaseResponse,
		releaseInfo,
		shouldDraft,
		isPreRelease,
	)
}
