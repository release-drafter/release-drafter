const getConfig = require('probot-config')
const { isTriggerableBranch } = require('./lib/triggerable-branch')
const { findReleases, generateReleaseInfo } = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { validateReplacers } = require('./lib/template')
const core = require('@actions/core')
const {
  validateSortBy,
  validateSortDirection,
  sortPullRequests,
  SORT_BY,
  SORT_DIRECTIONS
} = require('./lib/sort-pull-requests')
const log = require('./lib/log')

const configName = 'release-drafter.yml'

module.exports = app => {
  app.on('push', async context => {
    const defaults = {
      branches: context.payload.repository.default_branch,
      'change-template': `* $TITLE (#$NUMBER) @$AUTHOR`,
      'no-changes-template': `* No changes`,
      'version-template': `$MAJOR.$MINOR.$PATCH`,
      categories: [],
      'exclude-labels': [],
      replacers: [],
      'sort-by': SORT_BY.mergedAt,
      'sort-direction': SORT_DIRECTIONS.descending
    }
    const config = Object.assign(
      defaults,
      (await getConfig(context, configName)) || {}
    )
    config.replacers = validateReplacers({
      app,
      context,
      replacers: config.replacers
    })
    config['sort-by'] = validateSortBy(config['sort-by'])
    config['sort-direction'] = validateSortDirection(config['sort-direction'])

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    const branch = ref.replace(/^refs\/heads\//, '')

    if (!config.template) {
      log({ app, context, message: 'No valid config found' })
      return
    }

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
      mergedPullRequests: sortedMergedPullRequests
    })

    if (!draftRelease) {
      log({ app, context, message: 'Creating new draft release' })
      const resp = await context.github.repos.createRelease(
        context.repo({
          name: releaseInfo.name,
          tag_name: releaseInfo.tag,
          body: releaseInfo.body,
          draft: true
        })
      )
      core.setOutput('upload_url', resp.data.upload_url)
    } else {
      log({ app, context, message: 'Updating existing draft release' })
      const resp = await context.github.repos.updateRelease(
        context.repo({
          release_id: draftRelease.id,
          body: releaseInfo.body
        })
      )
      core.setOutput('upload_url', resp.data.upload_url)
    }
  })
}
