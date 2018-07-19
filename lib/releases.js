const compareVersions = require('compare-versions')

const sortReleases = (releases) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  try {
    return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
  } catch (error) {
    return releases.sort((r1, r2) => new Date(r1.published_at) - new Date(r2.published_at))
  }
}

module.exports.findReleases = async ({ context }) => {
  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo()),
    res => res.data
  )

  const sortedPublishedReleases = sortReleases(releases.filter(r => !r.draft))

  return {
    draftRelease: releases.find((r) => r.draft),
    lastRelease: sortedPublishedReleases[sortedPublishedReleases.length - 1]
  }
}

const changeString = (pullRequest) => (
  `* ${pullRequest.title} (#${pullRequest.number}) @${pullRequest.user.login}`
)

module.exports.generateReleaseBody = ({ config, lastRelease, mergedPullRequests }) => {
  let body = config.template

  if (!lastRelease) {
    body = body.replace('$PREVIOUS_TAG', '')
  } else {
    body = body.replace('$PREVIOUS_TAG', lastRelease.tag_name)
  }

  if (mergedPullRequests.length === 0) {
    body = body.replace('$CHANGES', '* No changes')
  } else {
    body = body.replace('$CHANGES', mergedPullRequests.map(changeString).join('\n'))
  }

  return body
}
