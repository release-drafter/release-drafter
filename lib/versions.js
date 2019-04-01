const semver = require('semver')

module.exports.getVersionInfo = (lastRelease, patchVersions = true) => {
  let lastVersion =
    semver.coerce(lastRelease.tag_name) || semver.coerce(lastRelease.name)

  if (!lastVersion) {
    return undefined
  }

  let versionInfo = {
    incrementedMajor: semver.inc(lastVersion, 'major', true),
    incrementedMinor: semver.inc(lastVersion, 'minor', true),
    incrementedPatch: semver.inc(lastVersion, 'patch', true)
  }

  if (patchVersions === false) {
    delete versionInfo.incrementedPatch
    Object.keys(versionInfo).forEach(function(key) {
      versionInfo[key] = versionInfo[key].replace(/\.\d+$/, '')
    })
  }

  return versionInfo
}
