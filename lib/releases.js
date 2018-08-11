const compareVersions = require('compare-versions')

const log = require('./log')

const sortReleases = (releases) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  try {
    return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
  } catch (error) {
    return releases.sort((r1, r2) => new Date(r1.published_at) - new Date(r2.published_at))
  }
}

module.exports.findReleases = async ({ app, context }) => {
  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo({
      per_page: 100
    })),
    res => res.data
  )

  log({ app, context, message: `Found ${releases.length} releases` })

  const sortedPublishedReleases = sortReleases(releases.filter(r => !r.draft))
  const draftRelease = releases.find((r) => r.draft)
  const lastRelease = sortedPublishedReleases[sortedPublishedReleases.length - 1]

  if (draftRelease) {
    log({ app, context, message: `Draft release: ${draftRelease.tag_name}` })
  } else {
    log({ app, context, message: `No draft release found` })
  }

  if (lastRelease) {
    log({ app, context, message: `Last release: ${lastRelease.tag_name}` })
  } else {
    log({ app, context, message: `No last release found` })
  }

  return { draftRelease, lastRelease }
}

module.exports.generateReleaseBody = ({ config, lastRelease, mergedPullRequests }) => {
  let body = config.template

  if (!lastRelease) {
    body = body.replace('$PREVIOUS_TAG', '')
  } else {
    body = body.replace('$PREVIOUS_TAG', lastRelease.tag_name)
  }

  if (mergedPullRequests.length === 0) {
    body = body.replace('$CHANGES', config['no-changes-template'])
  } else {
    body = body.replace('$CHANGES', mergedPullRequests.map((pullRequest) => (
      config['change-template']
        .replace('$TITLE', pullRequest.title)
        .replace('$NUMBER', pullRequest.number)
        .replace('$AUTHOR', pullRequest.user.login)
    )).join('\n'))
  }

  return body
}
