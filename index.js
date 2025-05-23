const { getConfig } = require('./lib/config')
const { isTriggerableReference } = require('./lib/triggerable-reference')
const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease,
  updateTaggedRelease,
} = require('./lib/releases')
const { findCommitsWithAssociatedPullRequests } = require('./lib/commits')
const { sortPullRequests } = require('./lib/sort-pull-requests')
const { log } = require('./lib/log')
const core = require('@actions/core')
const { runnerIsActions } = require('./lib/utils')
const ignore = require('ignore')

module.exports = (app, { getRouter }) => {
  if (!runnerIsActions() && typeof getRouter === 'function') {
    getRouter().get('/healthz', (request, response) => {
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
    ],
    async (context) => {
      const { configName, disableAutolabeler } = getInput()

      const config = await getConfig({
        context,
        configName,
      })

      if (config === null || disableAutolabeler) return

      let issue = {
        ...context.issue({ pull_number: context.payload.pull_request.number }),
      }
      const changedFiles = await context.octokit.paginate(
        context.octokit.pulls.listFiles.endpoint.merge(issue),
        (response) => response.data.map((file) => file.filename)
      )
      const labels = new Set()

      for (const autolabel of config['autolabeler']) {
        let found = false
        // check modified files
        if (!found && autolabel.files.length > 0) {
          const matcher = ignore().add(autolabel.files)
          if (changedFiles.some((file) => matcher.ignores(file))) {
            labels.add(autolabel.label)
            found = true
            log({
              context,
              message: `Found label for files: '${autolabel.label}'`,
            })
          }
        }
        // check branch names
        if (!found && autolabel.branch.length > 0) {
          for (const matcher of autolabel.branch) {
            if (matcher.test(context.payload.pull_request.head.ref)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for branch: '${autolabel.label}'`,
              })
              break
            }
          }
        }
        // check pr title
        if (!found && autolabel.title.length > 0) {
          for (const matcher of autolabel.title) {
            if (matcher.test(context.payload.pull_request.title)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for title: '${autolabel.label}'`,
              })
              break
            }
          }
        }
        // check pr body
        if (
          !found &&
          context.payload.pull_request.body != null &&
          autolabel.body.length > 0
        ) {
          for (const matcher of autolabel.body) {
            if (matcher.test(context.payload.pull_request.body)) {
              labels.add(autolabel.label)
              found = true
              log({
                context,
                message: `Found label for body: '${autolabel.label}'`,
              })
              break
            }
          }
        }
      }

      const labelsToAdd = [...labels]
      if (labelsToAdd.length > 0) {
        let labelIssue = {
          ...context.issue({
            issue_number: context.payload.pull_request.number,
            labels: labelsToAdd,
          }),
        }
        await context.octokit.issues.addLabels(labelIssue)
        if (runnerIsActions()) {
          core.setOutput('number', context.payload.pull_request.number)
          core.setOutput('labels', labelsToAdd.join(','))
        }
        return
      }
    }
  )

  const drafter = async (context) => {
    const input = getInput()

    const config = await getConfig({
      context,
      configName: input.configName,
    })

    if (!config || input.disableReleaser) return

    updateConfigFromInput(config, input)

    // GitHub Actions merge payloads slightly differ, in that their ref points
    // to the PR branch instead of refs/heads/master
    const ref = process.env['GITHUB_REF'] || context.payload.ref

    if (!isTriggerableReference({ ref, context, config })) {
      return
    }

    const targetCommitish = config.commitish || ref

    const {
      'filter-by-commitish': filterByCommitish,
      'include-pre-releases': includePreReleases,
      'prerelease-identifier': preReleaseIdentifier,
      'tag-prefix': tagPrefix,
      latest,
      prerelease,
    } = config

    const shouldIncludePreReleases = Boolean(
      includePreReleases || preReleaseIdentifier
    )

    const { draftRelease, lastRelease, taggedRelease } = await findReleases({
      context,
      targetCommitish,
      filterByCommitish,
      includePreReleases: shouldIncludePreReleases,
      tagPrefix,
      tag: input.tag,
    })

    const { commits, pullRequests: mergedPullRequests } =
      await findCommitsWithAssociatedPullRequests({
        context,
        targetCommitish,
        lastRelease,
        config,
      })

    const sortedMergedPullRequests = sortPullRequests(
      mergedPullRequests,
      config['sort-by'],
      config['sort-direction']
    )

    const { shouldDraft, version, tag, name } = input

    const releaseInfo = generateReleaseInfo({
      context,
      commits,
      config,
      lastRelease,
      mergedPullRequests: sortedMergedPullRequests,
      version,
      tag,
      name,
      isPreRelease: prerelease,
      latest,
      shouldDraft,
      targetCommitish,
    })

    let createOrUpdateReleaseResponse
    if (!draftRelease) {
      if (taggedRelease) {
        log({ context, message: 'Updateing existing tagged release' })
        createOrUpdateReleaseResponse = await updateTaggedRelease({
          context,
          lastRelease,
          releaseInfo,
          config,
        })
      } else {
        log({ context, message: 'Creating new release' })
        createOrUpdateReleaseResponse = await createRelease({
          context,
          releaseInfo,
          config,
        })
     }
    } else {
      log({ context, message: 'Updating existing draft release' })
      createOrUpdateReleaseResponse = await updateRelease({
        context,
        draftRelease,
        releaseInfo,
        config,
      })
    }

    if (runnerIsActions()) {
      setActionOutput(createOrUpdateReleaseResponse, releaseInfo)
    }
  }

  if (runnerIsActions()) {
    app.onAny(drafter)
  } else {
    app.on('push', drafter)
  }
}

function getInput() {
  return {
    configName: core.getInput('config-name'),
    shouldDraft: core.getInput('publish').toLowerCase() !== 'true',
    version: core.getInput('version') || undefined,
    tag: core.getInput('tag') || undefined,
    name: core.getInput('name') || undefined,
    disableReleaser: core.getInput('disable-releaser').toLowerCase() === 'true',
    disableAutolabeler:
      core.getInput('disable-autolabeler').toLowerCase() === 'true',
    commitish: core.getInput('commitish') || undefined,
    header: core.getInput('header') || undefined,
    footer: core.getInput('footer') || undefined,
    prerelease:
      core.getInput('prerelease') !== ''
        ? core.getInput('prerelease').toLowerCase() === 'true'
        : undefined,
    preReleaseIdentifier: core.getInput('prerelease-identifier') || undefined,
    latest: core.getInput('latest')?.toLowerCase() || undefined,
  }
}

/**
 * Merges the config file with the input
 * the input takes precedence, because it's more easy to change at runtime
 */
function updateConfigFromInput(config, input) {
  if (input.commitish) {
    config.commitish = input.commitish
  }

  if (input.header) {
    config.header = input.header
  }

  if (input.footer) {
    config.footer = input.footer
  }

  if (input.prerelease !== undefined) {
    config.prerelease = input.prerelease
  }

  if (input.preReleaseIdentifier) {
    config['prerelease-identifier'] = input.preReleaseIdentifier
  }

  config.latest = config.prerelease
    ? 'false'
    : input.latest || config.latest || undefined
}

function setActionOutput(
  releaseResponse,
  { body, resolvedVersion, majorVersion, minorVersion, patchVersion }
) {
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
  if (resolvedVersion) core.setOutput('resolved_version', resolvedVersion)
  if (majorVersion) core.setOutput('major_version', majorVersion)
  if (minorVersion) core.setOutput('minor_version', minorVersion)
  if (patchVersion) core.setOutput('patch_version', patchVersion)
  core.setOutput('body', body)
}
