const getConfig = require('probot-config')
const { isRelevantBranch } = require('./lib/branch')
const { findReleases, generateBody } = require('./lib/releases')
const { findMergedPullRequests } = require('./lib/pull-requests')

const configName = 'release-drafter.yml'

module.exports = app => {
  app.on('push', async context => {
    const config = await getConfig(context, configName) || {}
    const { body: template } = config
    const branch = context.payload.ref.replace(/^refs\/heads\//, '')

    if (!template) {
      app.log(`No valid config found`)
      return
    }

    if (!isRelevantBranch({ branch, app, context, config })) {
      return
    }

    const { draftRelease, lastRelease } = await findReleases({ context })
    const mergedPullRequests = await findMergedPullRequests({ app, context, branch, lastRelease })

    const body = generateBody({ template, lastRelease, mergedPullRequests })

    if (!draftRelease) {
      app.log(`Creating new draft release`)
      await context.github.repos.createRelease(context.repo({
        body: body,
        draft: true
      }))
    } else {
      app.log(`Updating existing draft release`, { draftRelease })
      await context.github.repos.editRelease(context.repo({
        release_id: draftRelease.id,
        body: body
      }))
    }
  })
}
