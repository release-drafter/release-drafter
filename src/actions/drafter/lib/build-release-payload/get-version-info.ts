import { Config, StandaloneInput } from 'src/types'
import { findPreviousReleases } from '../find-previous-releases'
import { resolveVersionKeyIncrement } from './resolve-version-increment'
import * as semver from 'semver'
import { renderTemplate } from './render-template'

type Release = Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease']

// TODO is this not supposed to be $MAJOR.$MINOR.$PATCH$PRERELEASE ?
const DEFAULT_VERSION_TEMPLATE = '$MAJOR.$MINOR.$PATCH'

export const getVersionInfo = (params: {
  lastRelease: Release
  config: Pick<
    Config,
    'version-template' | 'tag-prefix' | 'prerelease-identifier'
  >
  input: Pick<StandaloneInput, 'version' | 'tag' | 'name'>
  versionKeyIncrement: ReturnType<typeof resolveVersionKeyIncrement>
}) => {
  const {
    lastRelease,
    config,
    input,
    versionKeyIncrement: _versionKeyIncrement
  } = params

  let versionKeyIncrement = _versionKeyIncrement // local mutable copy

  const lastReleaseVersion = coerceVersion(lastRelease, {
    tagPrefix: config['tag-prefix']
  })
  const inputVersion = coerceVersion(
    /**
     * Use the first override parameter to identify
     * a version, from the most accurate to the least
     */
    input.version || input.tag || input.name,
    {
      tagPrefix: config['tag-prefix']
    }
  )

  const isPreVersionKeyIncrement = versionKeyIncrement?.startsWith('pre')

  if (!lastReleaseVersion && !inputVersion) {
    if (isPreVersionKeyIncrement) {
      defaultVersionInfo['$RESOLVED_VERSION'] = structuredClone(
        defaultVersionInfo['$NEXT_PRERELEASE_VERSION']
      )
    }

    // Apply custom version template to default version info
    if (
      config['version-template'] &&
      config['version-template'] !== DEFAULT_VERSION_TEMPLATE
    ) {
      const defaultVersion = toSemver('0.1.0') as semver.SemVer
      const templateableVersion = getTemplatableVersion({
        version: defaultVersion,
        template: config['version-template'],
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier: config['prerelease-identifier']
      })

      for (const key of Object.keys(templateableVersion)) {
        const keyTyped = key as keyof typeof templateableVersion
        if (
          templateableVersion[keyTyped] &&
          typeof templateableVersion[keyTyped] === 'object' &&
          templateableVersion[keyTyped].template
        ) {
          templateableVersion[keyTyped].version = renderTemplate({
            template: templateableVersion[keyTyped].template,
            object: templateableVersion[keyTyped]
          })
        }
      }

      // For first release, override $RESOLVED_VERSION to not increment
      let resolvedVersionObj = splitSemVersion({
        version: defaultVersion,
        template: config['version-template'],
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || 'patch',
        preReleaseIdentifier: config['prerelease-identifier']
      })

      if (!resolvedVersionObj) {
        throw new Error('Failed to generate resolved version object')
      }

      resolvedVersionObj = {
        ...resolvedVersionObj,
        version: renderTemplate({
          template: config['version-template'],
          object: resolvedVersionObj
        })
      }
      templateableVersion.$RESOLVED_VERSION = resolvedVersionObj

      return templateableVersion
    }

    return defaultVersionInfo
  }

  const shouldIncrementAsPrerelease =
    isPreVersionKeyIncrement && lastReleaseVersion?.prerelease?.length

  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = 'prerelease'
  }

  const templateableVersion = getTemplatableVersion({
    version: lastReleaseVersion,
    template: config['version-template'],
    inputVersion,
    versionKeyIncrement,
    preReleaseIdentifier: config['prerelease-identifier']
  })

  // Apply custom version template formatting if provided
  if (
    config['version-template'] &&
    config['version-template'] !== DEFAULT_VERSION_TEMPLATE
  ) {
    for (const key of Object.keys(templateableVersion)) {
      const keyTyped = key as keyof typeof templateableVersion
      if (
        templateableVersion[keyTyped] &&
        typeof templateableVersion[keyTyped] === 'object' &&
        templateableVersion[keyTyped].template
      ) {
        templateableVersion[keyTyped].version = renderTemplate({
          template: templateableVersion[keyTyped].template,
          object: templateableVersion[keyTyped]
        })
      }
    }
  }

  return templateableVersion
}

const toSemver = (version?: string | semver.SemVer | null | undefined) => {
  const result = semver.parse(version)
  if (result) {
    return result
  }

  // doesn't handle prerelease
  return semver.coerce(version)
}

/**
 * Get a semver version from various input types
 */
const coerceVersion = (
  input: Release | string | undefined,
  opt?: {
    tagPrefix?: Config['tag-prefix']
  }
) => {
  if (!input) {
    return null
  }

  const stripTag = (input?: string | null) =>
    !!opt?.tagPrefix && input?.startsWith(opt.tagPrefix)
      ? input.slice(opt.tagPrefix.length)
      : input

  return typeof input === 'object'
    ? toSemver(stripTag(input.tag_name)) || toSemver(stripTag(input.name))
    : toSemver(stripTag(input))
}

type VersionDescriptor = {
  version: semver.SemVer | string | null | undefined
  template: string
  inputVersion: semver.SemVer | null
  versionKeyIncrement: semver.ReleaseType
  inc: semver.ReleaseType
  preReleaseIdentifier?: string
}

type VersionDescriptorTemplates = {
  $MAJOR: number
  $MINOR: number
  $PATCH: number
  $PRERELEASE: string
  $COMPLETE?: string | null
}

const defaultVersionInfo: Record<
  `$${Uppercase<string>}`,
  (VersionDescriptor & VersionDescriptorTemplates) | null
> & {
  $INPUT_VERSION: Omit<
    VersionDescriptor & VersionDescriptorTemplates,
    'inc'
  > | null
} = {
  $NEXT_MAJOR_VERSION: {
    version: '1.0.0',
    template: '$MAJOR.$MINOR.$PATCH',
    inputVersion: null,
    versionKeyIncrement: 'patch',
    inc: 'major',
    $MAJOR: 1,
    $MINOR: 0,
    $PATCH: 0,
    $PRERELEASE: ''
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
    $PRERELEASE: ''
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
    $PRERELEASE: ''
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
    $PRERELEASE: '-rc.0'
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
    $PRERELEASE: ''
  }
}

const splitSemVersion = (
  input:
    | (Omit<VersionDescriptor, 'inc'> & Partial<Pick<VersionDescriptor, 'inc'>>)
    | null,
  versionKey: 'version' | 'inputVersion' = 'version'
) => {
  if (!input?.[versionKey]) {
    return
  }

  const version = input.inc
    ? semver.inc(input[versionKey], input.inc, true, input.preReleaseIdentifier)
    : typeof input[versionKey] === 'string'
      ? input[versionKey]
      : input[versionKey].version

  const prereleaseVersion = !version
    ? ''
    : semver.prerelease(version)?.join('.') || ''

  return {
    ...input,
    version,
    $MAJOR: semver.major(version || ''),
    $MINOR: semver.minor(version || ''),
    $PATCH: semver.patch(version || ''),
    $PRERELEASE: prereleaseVersion ? `-${prereleaseVersion}` : '',
    $COMPLETE: version
  }
}

const getTemplatableVersion = (input: Omit<VersionDescriptor, 'inc'>) => {
  const templatableVersion = {
    $NEXT_MAJOR_VERSION: splitSemVersion({
      ...input,
      inc: 'major'
    }),
    $NEXT_MAJOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MAJOR'
    }),
    $NEXT_MAJOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$MINOR'
    }),
    $NEXT_MAJOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'major',
      template: '$PATCH'
    }),
    $NEXT_MINOR_VERSION: splitSemVersion({ ...input, inc: 'minor' }),
    $NEXT_MINOR_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MAJOR'
    }),
    $NEXT_MINOR_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$MINOR'
    }),
    $NEXT_MINOR_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'minor',
      template: '$PATCH'
    }),
    $NEXT_PATCH_VERSION: splitSemVersion({ ...input, inc: 'patch' }),
    $NEXT_PATCH_VERSION_MAJOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MAJOR'
    }),
    $NEXT_PATCH_VERSION_MINOR: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$MINOR'
    }),
    $NEXT_PATCH_VERSION_PATCH: splitSemVersion({
      ...input,
      inc: 'patch',
      template: '$PATCH'
    }),
    $NEXT_PRERELEASE_VERSION: splitSemVersion({
      ...input,
      inc: 'prerelease',
      template: '$PRERELEASE'
    }),
    $INPUT_VERSION: splitSemVersion(input, 'inputVersion'),
    $RESOLVED_VERSION: splitSemVersion({
      ...input,
      inc: input.versionKeyIncrement || 'patch'
    })
  }

  templatableVersion.$RESOLVED_VERSION =
    templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION

  return templatableVersion
}
