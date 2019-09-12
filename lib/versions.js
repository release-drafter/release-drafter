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

module.exports.incrementVersionBasedOnLabels = (lastRelease, pullRequests) => {
  const lastVersion = this.getVersionInfo(lastRelease)
  const winningLabel = getWinningLabelFrom(pullRequests)
  switch (winningLabel) {
    case 'MINOR':
      return lastVersion.$NEXT_MINOR_VERSION.version
    case 'MAJOR':
      return lastVersion.$NEXT_MAJOR_VERSION.version
    default:
      return lastVersion.$NEXT_PATCH_VERSION.version
  }
}

const getWinningLabelFrom = pullRequests => {
  let winningLabel = 'PATCH'
  for (var i = 0; i < pullRequests.length; i++) {
    const pr = pullRequests[i]
    const labels = pr.labels
    for (var j = 0; j < labels.length; j++) {
      const label = labels[j]
      if (label.name === 'MINOR') {
        winningLabel = 'MINOR'
      }
      if (label.name === 'MAJOR') {
        return 'MAJOR'
      }
    }
  }
  return winningLabel
}
