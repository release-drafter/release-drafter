const semver = require('semver')

const splitSemVer = input => {
  const version = semver.inc(input.lastVersion, input.inc, true)

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version)
  }
}

const lastVersionSemVerIncremented = input => ({
  $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
  $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
  $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' })
})

module.exports.getVersionInfo = (lastRelease, template) => {
  const lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return undefined
  }

  return {
    ...lastVersionSemVerIncremented({
      lastVersion,
      template
    })
  }
}

module.exports.incrementVersionBasedOnLabels = (
  lastRelease,
  pullRequests,
  autoReleaseConfig
) => {
  const nextVersion = this.getVersionInfo(lastRelease)
  const winningLabel = getWinningLabelFrom(pullRequests, autoReleaseConfig)
  switch (winningLabel) {
    case 'MINOR':
      return nextVersion.$NEXT_MINOR_VERSION.version
    case 'MAJOR':
      return nextVersion.$NEXT_MAJOR_VERSION.version
    default:
      return nextVersion.$NEXT_PATCH_VERSION.version
  }
}

const getWinningLabelFrom = (pullRequests, autoReleaseConfig) => {
  let winningLabel = 'PATCH'
  for (var i = 0; i < pullRequests.length; i++) {
    const pr = pullRequests[i]
    const labels = pr.labels
    for (var j = 0; j < labels.length; j++) {
      const label = labels[j]
      if (
        autoReleaseConfig['minor-bump-labels']
          .map(label => label.toLowerCase())
          .includes(label.name.toLowerCase())
      ) {
        winningLabel = 'MINOR'
      }
      if (
        autoReleaseConfig['major-bump-labels']
          .map(label => label.toLowerCase())
          .includes(label.name.toLowerCase())
      ) {
        return 'MAJOR'
      }
    }
  }
  return winningLabel
}
