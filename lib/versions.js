const semver = require('semver')

const splitSemVer = input => {
  const version =
    !input.increment && input.inc === 'patch'
      ? semver.parse(input.version)
      : semver.inc(input.version, input.inc, true)

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version)
  }
}

const getTemplatableVersion = input => ({
  $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
  $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
  $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' })
})

module.exports.getVersionInfo = (release, template, increment = true) => {
  const version =
    typeof release === 'object'
      ? semver.coerce(release.tag_name) || semver.coerce(release.name)
      : semver.coerce(release)

  if (!version) {
    return undefined
  }

  return {
    ...getTemplatableVersion({
      version,
      template,
      increment
    })
  }
}
