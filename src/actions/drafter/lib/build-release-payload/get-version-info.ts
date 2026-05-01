import * as core from '@actions/core'
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

  core.info(`Resolving version info based on:`)
  core.info(`   - last release: ${lastRelease?.tag_name || 'none'}`)
  core.info(
    `   - version input: ${input.version || input.tag || input.name || 'none'}`,
  )
  core.info(`   - version key increment: ${_versionKeyIncrement}`)

  let _localIncrement: ReleaseType | 'no_increment' =
    structuredClone(_versionKeyIncrement) // local mutable copy

  core.info(`Coerce and parse versions from last release...`)
  const versionFromLastRelease = new VersionDescriptor(lastRelease, {
    tagPrefix: config['tag-prefix'],
    preReleaseIdentifier: config['prerelease-identifier'],
  })
  core.info(
    `Parsed version from last release: ${versionFromLastRelease.version?.format() || 'none'}.`,
  )

  core.info(`Coerce and parse versions from input...`)
  const versionFromInput = new VersionDescriptor(
    input.version || input.tag || input.name,
    {
      tagPrefix: config['tag-prefix'],
      preReleaseIdentifier: config['prerelease-identifier'],
    },
  )
  core.info(
    `Parsed version from input: ${versionFromInput.version?.format() || 'none'}.`,
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
    // No prior release and no input version: start from 0.1.0.
    // For prerelease-based increments (prepatch/preminor/premajor) with a
    // prerelease-identifier, build the reference as "0.1.0-<identifier>.0" and
    // use no_increment, so $RESOLVED_VERSION = "0.1.0-rc.0" — a prerelease *of*
    // the initial version rather than a prerelease of the next incremented
    // version (which semver's prepatch/preminor/premajor would otherwise
    // produce, e.g. "0.1.1-rc.0").  This restores the v6 behaviour introduced
    // in PR #1303.
    if (
      _versionKeyIncrement?.startsWith('pre') &&
      config['prerelease-identifier']
    ) {
      _localIncrement = 'no_increment'
      referenceVersion = new VersionDescriptor(
        `0.1.0-${config['prerelease-identifier']}.0`,
        {
          preReleaseIdentifier: config['prerelease-identifier'],
          tagPrefix: config['tag-prefix'],
        },
      )
    } else {
      _localIncrement = 'no_increment'
      referenceVersion = new VersionDescriptor('0.1.0', {
        preReleaseIdentifier: config['prerelease-identifier'],
        tagPrefix: config['tag-prefix'],
      })
    }
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
