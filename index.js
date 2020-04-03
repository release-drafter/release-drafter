const { getConfig } = require('./lib/config')
const { isTriggerableBranch } = require('./lib/triggerable-branch')
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease
} = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { sortPullRequests } = require('./lib/sort-pull-requests')
const log = require('./lib/log')
const core = require('@actions/core')

module.exports = app => {
  app.on('push', async context => {
    const { shouldDraft, configName, version, tag, name } = getInput()

    const config = await getConfig({
      app,
      context,
      configName
    })

    const { isPreRelease } = getInput({ config })

    if (config === null) return

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    const branch = ref.replace(/^refs\/heads\//, '')

    if (!isTriggerableBranch({ branch, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({ app, context })
    const {
      commits,
      pullRequests: mergedPullRequests
    } = await findCommitsWithAssociatedPullRequests({
      app,
      context,
      branch,
      lastRelease
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
      version,
      tag,
      name,
      isPreRelease,
      shouldDraft
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ app, context, message: 'Creating new release' })
      createOrUpdateReleaseResponse = await createRelease({
        context,
        releaseInfo,
        config
      })
    } else {
      log({ app, context, message: 'Updating existing release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        config
      })
    }

    setActionOutput(createOrUpdateReleaseResponse)
  })
}

function getInput({ config } = {}) {
  // Returns all the inputs that doesn't need a merge with the config file
  if (!config) {
    return {
      shouldDraft: core.getInput('publish').toLowerCase() !== 'true',
      configName: core.getInput('config-name'),
      version: core.getInput('version') || undefined,
      tag: core.getInput('tag') || undefined,
      name: core.getInput('name') || undefined
    }
  }

  // Merges the config file with the input
  // the input takes precedence, because it's more easy to change at runtime
  return {
    isPreRelease:
      core.getInput('prerelease').toLowerCase() === 'true' ||
      (!core.getInput('prerelease') && config.prerelease)
  }
}

function setActionOutput(releaseResponse) {
  const {
    data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
  } = releaseResponse
  if (releaseId && Number.isInteger(releaseId))
    core.setOutput('id', releaseId.toString())
  if (htmlUrl) core.setOutput('html_url', htmlUrl)
  if (uploadUrl) core.setOutput('upload_url', uploadUrl)
}
