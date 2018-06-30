const compareVersions = require('compare-versions')

module.exports.findReleases = async ({ context }) => {
  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo()),
    res => res.data
  )

  const sortedPublishedReleases = releases
    .filter(r => !r.draft)
    .sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))

  return {
    draftRelease: releases.find((r) => r.draft),
    lastRelease: sortedPublishedReleases[sortedPublishedReleases.length - 1]
  }
}

module.exports.generateBody = ({ template, lastRelease, mergedPullRequests }) => {
  let body = template

  if (lastRelease) {
    body = body.replace('$PREVIOUS_TAG', lastRelease.tag_name)
  }

  if (lastRelease) {
    if (mergedPullRequests.length === 0) {
      body = body.replace('$CHANGES', '* No changes')
    } else {
      body = body.replace('$CHANGES', mergedPullRequests.map(pr => (
        `* ${pr.title} #${pr.number} (@${pr.user.login})`
      )).join('\n'))
    }
  }

  return body
}
