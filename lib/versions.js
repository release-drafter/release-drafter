const semver = require('semver')
const calver = require('./calver')

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

const getTemplatableSemVer = (input) => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVer({ ...input, inc: 'major' }),
    $NEXT_MINOR_VERSION: splitSemVer({ ...input, inc: 'minor' }),
    $NEXT_PATCH_VERSION: splitSemVer({ ...input, inc: 'patch' }),
    $INPUT_VERSION: splitSemVer(input, 'inputVersion'),
    $RESOLVED_VERSION: splitSemVer({
      ...input,
      inc: input.versionKeyIncrement || 'patch',
    }),
    $VERSIONING_SCHEME: 'semver',
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}

const coerceSemVer = (input) => {
  if (!input) {
    return null
  }

  return typeof input === 'object'
    ? semver.coerce(input.tag_name) || semver.coerce(input.name)
    : semver.coerce(input)
}

const getTemplatableCalVer = (input) => {
  let templatableVersion = {}
  const newVersion = calver.init(input.template)

  // Detect if a new date based version would result in a change
  if (!calver.dateSpecEq(input.version, newVersion)) {
    templatableVersion = {
      $NEXT_MAJOR_VERSION: { ...input, ...newVersion },
      $NEXT_MINOR_VERSION: { ...input, ...newVersion },
      $NEXT_PATCH_VERSION: { ...input, ...newVersion },
      $INPUT_VERSION: calver.inc(input, 'inputVersion'),
      $RESOLVED_VERSION: { ...input, ...newVersion },
      $VERSIONING_SCHEME: 'calver',
    }
  } else {
    templatableVersion = {
      $NEXT_MAJOR_VERSION: calver.inc({ ...input, inc: 'major' }),
      $NEXT_MINOR_VERSION: calver.inc({ ...input, inc: 'minor' }),
      $NEXT_PATCH_VERSION: calver.inc({ ...input, inc: 'patch' }),
      $INPUT_VERSION: calver.inc(input, 'inputVersion'),
      $RESOLVED_VERSION: calver.inc({
        ...input,
        inc: input.versionKeyIncrement || 'patch',
      }),
      $VERSIONING_SCHEME: 'calver',
    }
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}

const coerceCalVer = (input, template) => {
  if (!input) {
    return null
  }

  return typeof input === 'object'
    ? calver.parse(template, input.tag_name) ||
        calver.parse(template, input.name)
    : calver.parse(template, input)
}

module.exports.getVersionInfo = (
  release,
  template,
  inputVersion = null,
  versionKeyIncrement = null
) => {
  if (calver.parseTemplate(template)) {
    // Detect Calendar Versioning
    const version = coerceCalVer(release, template)
    inputVersion = coerceCalVer(inputVersion, template)

    if (!version && !inputVersion) {
      return undefined
    }

    return {
      ...getTemplatableCalVer({
        version,
        template,
        inputVersion,
        versionKeyIncrement,
      }),
    }
  } else {
    // Otherwise assume Semantic Versioning
    const version = coerceSemVer(release)
    inputVersion = coerceSemVer(inputVersion)

    if (!version && !inputVersion) {
      return undefined
    }

    return {
      ...getTemplatableSemVer({
        version,
        template,
        inputVersion,
        versionKeyIncrement,
      }),
    }
  }
}
