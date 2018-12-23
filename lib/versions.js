const semver = require('semver')

module.exports.getVersionInfo = lastRelease => {
  let lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return undefined
  }

  return {
    incrementedMajor: semver.inc(lastVersion, 'major', true),
    incrementedMinor: semver.inc(lastVersion, 'minor', true),
    incrementedPatch: semver.inc(lastVersion, 'patch', true)
  }
}
