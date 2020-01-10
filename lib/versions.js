const semver = require('semver')

const splitSemVer = (input, versionKey = 'version') => {
  if (!input[versionKey]) {
    return null
  }

  const version = input.inc
    ? semver.inc(input[versionKey], input.inc, true)
    : semver.parse(input[versionKey])

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version)
  }
}

const getTemplatableVersion = input => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
    $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
    $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' }),
    $INPUT_VERSION: splitSemVer(input, 'inputVersion'),
    $RESOLVED_VERSION: null
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$NEXT_PATCH_VERSION

  return templatableVersion
}

const coerceVersion = input => {
  if (!input) {
    return null
  }

  return typeof input === 'object'
    ? semver.coerce(input.tag_name) || semver.coerce(input.name)
    : semver.coerce(input)
}

module.exports.getVersionInfo = (release, template, inputVersion = null) => {
  const version = coerceVersion(release)
  inputVersion = coerceVersion(inputVersion)

  if (!version && !inputVersion) {
    return undefined
  }

  return {
    ...getTemplatableVersion({
      version,
      template,
      inputVersion
    })
  }
}
