import type { ReleaseType } from 'semver'
import type { Config, ExclusiveInput } from '../../config'
import type { findPreviousReleases } from '../find-previous-releases'
import type { resolveVersionKeyIncrement } from './resolve-version-increment'
import { VersionDescriptor } from './version-descriptor'

type Release = Exclude<
  Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease'],
  undefined
>

export const getVersionInfo = (params: {
  lastRelease: Pick<Release, 'tag_name' | 'name'> | undefined
  config: Pick<
    Config,
    'version-template' | 'tag-prefix' | 'prerelease-identifier'
  >
  input: Pick<ExclusiveInput, 'version' | 'tag' | 'name'>
  versionKeyIncrement: ReturnType<typeof resolveVersionKeyIncrement>
}) => {
  const {
    lastRelease,
    config,
    input,
    versionKeyIncrement: _versionKeyIncrement,
  } = params

  let _localIncrement: ReleaseType | 'no_increment' =
    structuredClone(_versionKeyIncrement) // local mutable copy

  const versionFromLastRelease = new VersionDescriptor(lastRelease, {
    tagPrefix: config['tag-prefix'],
    preReleaseIdentifier: config['prerelease-identifier'],
  })
  const versionFromInput = new VersionDescriptor(
    input.version || input.tag || input.name,
    {
      tagPrefix: config['tag-prefix'],
      preReleaseIdentifier: config['prerelease-identifier'],
    },
  )

  let referenceVersion: VersionDescriptor
  if (versionFromInput.version) {
    _localIncrement = 'no_increment' // use that exact input version
    referenceVersion = versionFromInput
  } else if (versionFromLastRelease.version) {
    _localIncrement =
      _localIncrement?.startsWith('pre') &&
      versionFromLastRelease?.prerelease?.length
        ? 'prerelease'
        : _localIncrement
    referenceVersion = versionFromLastRelease
  } else {
    _localIncrement = 'no_increment' // stay at 0.1.0 since no version was provided / found
    referenceVersion = new VersionDescriptor('0.1.0', {
      preReleaseIdentifier: config['prerelease-identifier'],
      tagPrefix: config['tag-prefix'],
    })
  }

  return {
    $NEXT_MAJOR_VERSION: referenceVersion
      .incremented('major')
      .rendered(config['version-template']),
    $NEXT_MAJOR_VERSION_MAJOR: referenceVersion.incremented('major').major,
    $NEXT_MAJOR_VERSION_MINOR: referenceVersion.incremented('major').minor,
    $NEXT_MAJOR_VERSION_PATCH: referenceVersion.incremented('major').patch,
    $NEXT_MINOR_VERSION: referenceVersion
      .incremented('minor')
      .rendered(config['version-template']),
    $NEXT_MINOR_VERSION_MAJOR: referenceVersion.incremented('minor').major,
    $NEXT_MINOR_VERSION_MINOR: referenceVersion.incremented('minor').minor,
    $NEXT_MINOR_VERSION_PATCH: referenceVersion.incremented('minor').patch,
    $NEXT_PATCH_VERSION: referenceVersion
      .incremented('patch')
      .rendered(config['version-template']),
    $NEXT_PATCH_VERSION_MAJOR: referenceVersion.incremented('patch').major,
    $NEXT_PATCH_VERSION_MINOR: referenceVersion.incremented('patch').minor,
    $NEXT_PATCH_VERSION_PATCH: referenceVersion.incremented('patch').patch,
    $NEXT_PRERELEASE_VERSION: referenceVersion
      .incremented('prerelease')
      .rendered(config['version-template']),
    $NEXT_PRERELEASE_VERSION_PRERELEASE:
      referenceVersion.incremented('prerelease').prerelease,
    $RESOLVED_VERSION: referenceVersion
      .incremented(_localIncrement)
      .rendered(config['version-template']),
    $RESOLVED_VERSION_MAJOR:
      referenceVersion.incremented(_localIncrement).major,
    $RESOLVED_VERSION_MINOR:
      referenceVersion.incremented(_localIncrement).minor,
    $RESOLVED_VERSION_PATCH:
      referenceVersion.incremented(_localIncrement).patch,
    $RESOLVED_VERSION_PRERELEASE:
      referenceVersion.incremented(_localIncrement).prerelease,
  }
}
