import * as core from '@actions/core'
import type { ReleaseType } from 'semver'
import type { Config, ExclusiveInput } from '../../config/index.ts'
import type { findPreviousReleases } from '../find-previous-releases/index.ts'
import type { resolveVersionKeyIncrement } from './resolve-version-increment.ts'
import { VersionDescriptor } from './version-descriptor.ts'

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
    // No prior release and no input version: anchor to a 0.0.0 baseline and let
    // semver apply the resolved increment, so the first draft is canonical and
    // matches semver's own behaviour from zero:
    //   premajor → 1.0.0, preminor → 0.1.0, prepatch → 0.0.1
    // (each carrying the prerelease suffix when an identifier is set), and the
    // stable axes line up too (major → 1.0.0, minor → 0.1.0). Fixes #1603,
    // where premajor on first run incorrectly produced 0.1.0-rc.0.
    //
    // A default stable bump (`patch`, the resolver's fallback) is promoted to
    // `minor` so a first stable draft is 0.1.0 rather than 0.0.1, matching the
    // long-standing "first release is 0.1.0" convention. Prerelease increments
    // keep their axis, so an explicit prepatch yields 0.0.1-<id>.0.
    if (_localIncrement === 'patch') {
      _localIncrement = 'minor'
    }
    referenceVersion = new VersionDescriptor('0.0.0', {
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
