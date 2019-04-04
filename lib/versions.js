const semver = require('semver')

const splitSemVer = (lastVersion, inc, template) => {
  const version = semver.inc(lastVersion, inc, true)

  return {
    version,
    template,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version)
  }
}

const lastVersionSemVerIncremented = (lastVersion, versionTemplate) => ({
  $NEXT_MAJOR_VERSION: splitSemVer(lastVersion, 'major', versionTemplate),
  $NEXT_MINOR_VERSION: splitSemVer(lastVersion, 'minor', versionTemplate),
  $NEXT_PATCH_VERSION: splitSemVer(lastVersion, 'patch', versionTemplate)
})

module.exports.getVersionInfo = (lastRelease, versionTemplate) => {
  const lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return undefined
  }

  return {
    ...lastVersionSemVerIncremented(lastVersion, versionTemplate)
  }
}
