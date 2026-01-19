const semver = require('semver')

const splitSemVersion = (input, versionKey = 'version') => {
  if (!input[versionKey]) {
    return
  }

  const version = input.inc
    ? semver.inc(input[versionKey], input.inc, true, input.preReleaseIdentifier)
    : input[versionKey].version

  const prereleaseVersion = semver.prerelease(version)?.join('.') || ''

  return {
    ...input,
    version,
    $MAJOR: semver.major(version),
    $MINOR: semver.minor(version),
    $PATCH: semver.patch(version),
    $PRERELEASE: prereleaseVersion ? `-${prereleaseVersion}` : '',
    $COMPLETE: version,
  }
}

const defaultVersionInfo = {
  $NEXT_MAJOR_VERSION: {
    version: '1.0.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'major',
    $MAJOR: 1,
    $MINOR: 0,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_MINOR_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'minor',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_PATCH_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'patch',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
  $NEXT_PRERELEASE_VERSION: {
    version: '0.1.0-rc.0',
    template: '$MAJOR.$MINOR.$PATCH$PRERELEASE',
    inputVersion: null,
    versionKeyIncrement: 'prerelease',
    inc: 'prerelease',
    preReleaseIdentifier: 'rc',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '-rc.0',
  },
  $INPUT_VERSION: null,
  $RESOLVED_VERSION: {
    version: '0.1.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'patch',
    $MAJOR: 0,
    $MINOR: 1,
    $PATCH: 0,
    $PRERELEASE: '',
  },
}

const getTemplatableVersion = (input) => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVersion({ ...input, inc: 'major' }),
    $NEXT_MAJOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MAJOR',
    }),
    $NEXT_MAJOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MINOR',
    }),
    $NEXT_MAJOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$PATCH',
    }),
    $NEXT_MINOR_VERSION: splitSemVersion({ ...input, inc: 'minor' }),
    $NEXT_MINOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MAJOR',
    }),
    $NEXT_MINOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MINOR',
    }),
    $NEXT_MINOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$PATCH',
    }),
    $NEXT_PATCH_VERSION: splitSemVersion({ ...input, inc: 'patch' }),
    $NEXT_PATCH_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MAJOR',
    }),
    $NEXT_PATCH_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MINOR',
    }),
    $NEXT_PATCH_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$PATCH',
    }),
    $NEXT_PRERELEASE_VERSION: splitSemVersion({
      ...input,
      inc: 'prerelease',
      template: '$PRERELEASE',
    }),
    $INPUT_VERSION: splitSemVersion(input, 'inputVersion'),
    $RESOLVED_VERSION: splitSemVersion({
      ...input,
      inc: input.versionKeyIncrement || 'patch',
    }),
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}

const toSemver = (version) => {
  const result = semver.parse(version)
  if (result) {
    return result
  }

  // doesn't handle prerelease
  return semver.coerce(version)
}

const coerceVersion = (input, tagPrefix) => {
  if (!input) {
    return
  }

  const stripTag = (input) =>
    tagPrefix && input.startsWith(tagPrefix)
      ? input.slice(tagPrefix.length)
      : input

  return typeof input === 'object'
    ? toSemver(stripTag(input.tag_name)) || toSemver(stripTag(input.name))
    : toSemver(stripTag(input))
}

const getVersionInfo = (
  release,
  template,
  inputVersion,
  versionKeyIncrement,
  tagPrefix,
  preReleaseIdentifier
) => {
  const version = coerceVersion(release, tagPrefix)
  inputVersion = coerceVersion(inputVersion, tagPrefix)

  const isPreVersionKeyIncrement = versionKeyIncrement?.startsWith('pre')

  if (!version && !inputVersion) {
    if (isPreVersionKeyIncrement) {
      defaultVersionInfo['$RESOLVED_VERSION'] = {
        ...defaultVersionInfo['$NEXT_PRERELEASE_VERSION'],
      }
    }

    // Apply custom version template to default version info
    if (template && template !== '$MAJOR.$MINOR.$PATCH') {
      const defaultVersion = toSemver('0.1.0')
      const templateableVersion = getTemplatableVersion({
        version: defaultVersion,
        template,
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier,
      })

      // Apply template formatting to all version objects
      const { template: templateFunc } = require('./template')

      for (const key of Object.keys(templateableVersion)) {
        if (
          templateableVersion[key] &&
          typeof templateableVersion[key] === 'object' &&
          templateableVersion[key].template
        ) {
          templateableVersion[key].version = templateFunc(
            templateableVersion[key].template,
            templateableVersion[key]
          )
        }
      }

      // For first release, override $RESOLVED_VERSION to not increment
      const resolvedVersionObj = splitSemVersion({
        version: defaultVersion,
        template,
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier,
      })
      resolvedVersionObj.version = templateFunc(template, resolvedVersionObj)
      templateableVersion.$RESOLVED_VERSION = resolvedVersionObj

      return templateableVersion
    }

    return defaultVersionInfo
  }

  const shouldIncrementAsPrerelease =
    isPreVersionKeyIncrement && version?.prerelease?.length

  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = 'prerelease'
  }

  const templateableVersion = getTemplatableVersion({
    version,
    template,
    inputVersion,
    versionKeyIncrement,
    preReleaseIdentifier,
  })

  // Apply custom version template formatting if provided
  if (template && template !== '$MAJOR.$MINOR.$PATCH') {
    const { template: templateFunc } = require('./template')

    for (const key of Object.keys(templateableVersion)) {
      if (
        templateableVersion[key] &&
        typeof templateableVersion[key] === 'object' &&
        templateableVersion[key].template
      ) {
        templateableVersion[key].version = templateFunc(
          templateableVersion[key].template,
          templateableVersion[key]
        )
      }
    }
  }

  return templateableVersion
}

exports.getVersionInfo = getVersionInfo
exports.defaultVersionInfo = defaultVersionInfo
