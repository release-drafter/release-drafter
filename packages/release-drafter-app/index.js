const { getConfig } = require('release-drafter-core/lib/config')
const { isTriggerableReference } = require('./lib/triggerable-reference')
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease,
} = require('release-drafter-core/lib/releases')
const {
  findCommitsWithAssociatedPullRequests,
} = require('release-drafter-core/lib/commits')
const {
  sortPullRequests,
} = require('release-drafter-core/lib/sort-pull-requests')
const log = require('release-drafter-core/lib/log')

module.exports = (app) => {
  app.on('push', async (context) => {
    const config = await getConfig({
      context,
      configName,
    })

    if (config === null) return

    const ref = context.payload.ref

    if (!isTriggerableReference({ ref, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({
      ref,
      context,
      config,
    })
    const {
      commits,
      pullRequests: mergedPullRequests,
    } = await findCommitsWithAssociatedPullRequests({
      context,
      ref,
      lastRelease,
      config,
    })

    const sortedMergedPullRequests = sortPullRequests(
      mergedPullRequests,
      config['sort-by'],
      config['sort-direction']
    )

    const releaseInfo = generateReleaseInfo({
      commits,
      config,
      lastRelease,
      mergedPullRequests: sortedMergedPullRequests,
      version: undefined,
      tag: undefined,
      name: undefined,
      isPreRelease: config.prerelease,
      shouldDraft: true,
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ context, message: 'Creating new release' })
      createOrUpdateReleaseResponse = await createRelease({
        context,
        releaseInfo,
        config,
      })
    } else {
      log({ context, message: 'Updating existing release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        config,
      })
    }
  })
}
