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

module.exports.incrementVersionBasedOnLabels = (lastVersion, pullRequests) => {
  const winningLabel = getWinningLabelFrom(pullRequests)
  // Switch?
  if (winningLabel === 'MINOR') {
    return lastVersion.incrementedMinor
  }
  if (winningLabel === 'MAJOR') {
    return lastVersion.incrementedMajor
  }
  return lastVersion.incrementedPatch
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
