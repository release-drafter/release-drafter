const { getConfig } = require('./lib/config')
const { isTriggerableReference } = require('./lib/triggerable-reference')
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease,
} = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { sortPullRequests } = require('./lib/sort-pull-requests')
const log = require('./lib/log')
const core = require('@actions/core')

module.exports = (app) => {
  app.on('*', async (context) => {
    const { shouldDraft, configName, version, tag, name } = getInput()

    const config = await getConfig({
      app,
      context,
      configName,
    })

    const { isPreRelease } = getInput({ config })

    if (config === null) return

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    if (!isTriggerableReference({ ref, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({ app, context })
    const {
      commits,
      pullRequests: mergedPullRequests,
    } = await findCommitsWithAssociatedPullRequests({
      app,
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
      version,
      tag,
      name,
      isPreRelease,
      shouldDraft,
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ app, context, message: 'Creating new release' })
      createOrUpdateReleaseResponse = await createRelease({
        context,
        releaseInfo,
        config,
      })
    } else {
      log({ app, context, message: 'Updating existing release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        config,
      })
    }

    setActionOutput(createOrUpdateReleaseResponse, releaseInfo)
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
      name: core.getInput('name') || undefined,
    }
  }

  // Merges the config file with the input
  // the input takes precedence, because it's more easy to change at runtime
  const preRelease = core.getInput('prerelease').toLowerCase()
  return {
    isPreRelease: preRelease === 'true' || (!preRelease && config.prerelease),
  }
}

function setActionOutput(releaseResponse, { body }) {
  const {
    data: {
      id: releaseId,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      tag_name: tagName,
      name: name,
    },
  } = releaseResponse
  if (releaseId && Number.isInteger(releaseId))
    core.setOutput('id', releaseId.toString())
  if (htmlUrl) core.setOutput('html_url', htmlUrl)
  if (uploadUrl) core.setOutput('upload_url', uploadUrl)
  if (tagName) core.setOutput('tag_name', tagName)
  if (name) core.setOutput('name', name)
  core.setOutput('body', body)
}
