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
