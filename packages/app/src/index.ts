import { Context } from '@release-drafter/core'
import { ApplicationFunction, Context as ProbotContext } from 'probot'
import { ReleaseDrafterOctokit } from '@release-drafter/core'

const app: ApplicationFunction = async (app, { getRouter }) => {
	if (typeof getRouter === 'function') {
		getRouter().get('/healthz', (_, response) => {
			response.status(200).json({ status: 'pass' })
		})
	}

	app.on(
		[
			'pull_request.opened',
			'pull_request.reopened',
			'pull_request.synchronize',
			'pull_request.edited',
			'pull_request_target.opened',
			'pull_request_target.reopened',
			'pull_request_target.synchronize',
			'pull_request_target.edited',
		] as never,
		async (context: ProbotContext<'pull_request'>) => {
			const pullRequest = context.pullRequest()

			const myContext = new Context(
				context.octokit as unknown as InstanceType<
					typeof ReleaseDrafterOctokit
				>,
				context.payload.repository.default_branch,
				{ ...pullRequest, configName: 'release-drafter.yml' },
			)

			const config = await myContext.config()
		},
	)

	// const drafter = async (context) => {
	// 	const config = await getConfig({
	// 		context,
	// 	})
	//
	// 	if (config === null) return
	//
	// 	// GitHub Actions merge payloads slightly differ, in that their ref points
	// 	// to the PR branch instead of refs/heads/main
	// 	const reference = process.env['GITHUB_REF'] || context.payload.ref
	//
	// 	if (!isTriggerableReference({ ref: reference, context, config })) {
	// 		return
	// 	}
	//
	// 	const targetCommitish = config['commitish'] || reference
	// 	const {
	// 		'filter-by-commitish': filterByCommitish,
	// 		'tag-prefix': tagPrefix,
	// 	} = config
	//
	// 	const { draftRelease, lastRelease } = await findReleases({
	// 		context,
	// 		targetCommitish,
	// 		filterByCommitish,
	// 		tagPrefix,
	// 	})
	//
	// 	const { commits, pullRequests: mergedPullRequests } =
	// 		await findCommitsWithAssociatedPullRequests({
	// 			context,
	// 			targetCommitish,
	// 			lastRelease,
	// 			config,
	// 		})
	//
	// 	const sortedMergedPullRequests = sortPullRequests(
	// 		mergedPullRequests,
	// 		config['sort-by'],
	// 		config['sort-direction'],
	// 	)
	//
	// 	const releaseInfo = generateReleaseInfo({
	// 		context,
	// 		commits,
	// 		config,
	// 		lastRelease,
	// 		mergedPullRequests: sortedMergedPullRequests,
	// 		targetCommitish,
	// 	})
	//
	// 	let createOrUpdateReleaseResponse
	// 	if (!draftRelease) {
	// 		log({ context, message: 'Creating new release' })
	// 		createOrUpdateReleaseResponse = await createRelease({
	// 			context,
	// 			releaseInfo,
	// 			config,
	// 		})
	// 	} else {
	// 		log({ context, message: 'Updating existing release' })
	// 		createOrUpdateReleaseResponse = await updateRelease({
	// 			context,
	// 			draftRelease,
	// 			releaseInfo,
	// 			config,
	// 		})
	// 	}
	// }
	//
	// app.on('push', drafter)
}

export default app
