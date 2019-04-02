const getConfig = require('probot-config')
const { isTriggerableBranch } = require('./lib/triggerable-branch')
const { findReleases, generateReleaseInfo } = require('./lib/releases')
const { findCommits, findPullRequests } = require('./lib/commits')
const log = require('./lib/log')

const configName = 'release-drafter.yml'

module.exports = app => {
  app.on('push', async context => {
    const defaults = {
      branches: context.payload.repository.default_branch,
      'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
      'no-changes-template': `* No changes`,
      'version-template': `$MAJOR.$MINOR.$PATCH`,
      categories: []
    }
    const config = Object.assign(
      defaults,
      (await getConfig(context, configName)) || {}
    )

    const branch = context.payload.ref.replace(/^refs\/heads\//, '')

    if (!config.template) {
      log({ app, context, message: 'No valid config found' })
      return
    }

    if (!isTriggerableBranch({ branch, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({ app, context })
    const commits = await findCommits({ app, context, branch, lastRelease })
    const mergedPullRequests = await findPullRequests({ app, context, commits })
    const releaseInfo = generateReleaseInfo({
      commits,
      config,
      lastRelease,
      mergedPullRequests
    })

    if (!draftRelease) {
      log({ app, context, message: 'Creating new draft release' })
      await context.github.repos.createRelease(
        context.repo({
          name: releaseInfo.name,
          tag_name: releaseInfo.tag,
          body: releaseInfo.body,
          draft: true
        })
      )
    } else {
      log({ app, context, message: 'Updating existing draft release' })
      await context.github.repos.updateRelease(
        context.repo({
          release_id: draftRelease.id,
          body: releaseInfo.body
        })
      )
    }
  })
}
