const semver = require('semver')

const splitSemVer = (lastVersion, inc) => {
  const version = semver.inc(lastVersion, inc, true)

  return {
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version)
  }
}

const lastVersionSemVerIncremented = lastVersion => ({
  $NEXT_MAJOR_VERSION: splitSemVer(lastVersion, 'major'),
  $NEXT_MINOR_VERSION: splitSemVer(lastVersion, 'minor'),
  $NEXT_PATCH_VERSION: splitSemVer(lastVersion, 'patch')
})

module.exports.getVersionInfo = lastRelease => {
  const lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return undefined
  }

  return {
    ...lastVersionSemVerIncremented(lastVersion)
  }
}
