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
    $PATCH: semver.patch(version),
  }
}

const getTemplatableVersion = (input) => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
    $NEXT_MAJOR_VERSION_MAJOR: splitSemVer({
      ...input,
      inc: 'major',
      template: '$MAJOR',
    }),
    $NEXT_MAJOR_VERSION_MINOR: splitSemVer({
      ...input,
      inc: 'major',
      template: '$MINOR',
    }),
    $NEXT_MAJOR_VERSION_PATCH: splitSemVer({
      ...input,
      inc: 'major',
      template: '$PATCH',
    }),
    $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
    $NEXT_MINOR_VERSION_MAJOR: splitSemVer({
      ...input,
      inc: 'minor',
      template: '$MAJOR',
    }),
    $NEXT_MINOR_VERSION_MINOR: splitSemVer({
      ...input,
      inc: 'minor',
      template: '$MINOR',
    }),
    $NEXT_MINOR_VERSION_PATCH: splitSemVer({
      ...input,
      inc: 'minor',
      template: '$PATCH',
    }),
    $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' }),
    $NEXT_PATCH_VERSION_MAJOR: splitSemVer({
      ...input,
      inc: 'patch',
      template: '$MAJOR',
    }),
    $NEXT_PATCH_VERSION_MINOR: splitSemVer({
      ...input,
      inc: 'patch',
      template: '$MINOR',
    }),
    $NEXT_PATCH_VERSION_PATCH: splitSemVer({
      ...input,
      inc: 'patch',
      template: '$PATCH',
    }),
    $INPUT_VERSION: splitSemVer(input, 'inputVersion'),
    $RESOLVED_VERSION: splitSemVer({
      ...input,
      inc: input.versionKeyIncrement || 'patch',
    }),
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}

const coerceVersion = (input) => {
  if (!input) {
    return null
  }

  return typeof input === 'object'
    ? semver.coerce(input.tag_name) || semver.coerce(input.name)
    : semver.coerce(input)
}

module.exports.getVersionInfo = (
  release,
  template,
  inputVersion = null,
  versionKeyIncrement = null
) => {
  const version = coerceVersion(release)
  inputVersion = coerceVersion(inputVersion)

  if (!version && !inputVersion) {
    return undefined
  }

  return {
    ...getTemplatableVersion({
      version,
      template,
      inputVersion,
      versionKeyIncrement,
    }),
  }
}
