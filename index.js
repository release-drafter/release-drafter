const { getConfig } = require('./lib/config')
const { isTriggerableBranch } = require('./lib/triggerable-branch')
const { findReleases, generateReleaseInfo } = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { sortPullRequests } = require('./lib/sort-pull-requests')
const log = require('./lib/log')
const core = require('@actions/core')

module.exports = app => {
  app.on('push', async context => {
    const config = await getConfig({
      app,
      context,
      configName: core.getInput('config-name')
    })

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
      version: core.getInput('version') || undefined,
      tag: core.getInput('tag') || undefined,
      name: core.getInput('name') || undefined
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      log({ app, context, message: 'Creating new draft release' })
      createOrUpdateReleaseResponse = await context.github.repos.createRelease(
        context.repo({
          name: releaseInfo.name,
          tag_name: releaseInfo.tag,
          body: releaseInfo.body,
          draft: true,
          prerelease: config.prerelease
        })
      )
    } else {
      log({ app, context, message: 'Updating existing draft release' })
      createOrUpdateReleaseResponse = await context.github.repos.updateRelease(
        context.repo({
          release_id: draftRelease.id,
          body: releaseInfo.body,
          ...(draftRelease.tag_name
            ? { tag_name: draftRelease.tag_name }
            : null)
        })
      )
    }

    setActionOutput(createOrUpdateReleaseResponse)
  })
}

function setActionOutput(releaseResponse) {
  const {
    data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
  } = releaseResponse
  core.setOutput('id', releaseId)
  core.setOutput('html_url', htmlUrl)
  core.setOutput('upload_url', uploadUrl)
}
