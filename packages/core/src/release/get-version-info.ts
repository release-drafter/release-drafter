import type { ReleaseType } from 'semver'
import type { Config } from '../config/config.schema.ts'
import type { Logger } from '../ports.ts'
import type { Release, ReleaseInput } from '../types.ts'
import { VersionDescriptor } from './version-descriptor.ts'

export const getVersionInfo = (params: {
  lastRelease: Pick<Release, 'tagName' | 'name'> | undefined
  config: Pick<
    Config,
    'version-template' | 'tag-prefix' | 'prerelease-identifier'
  >
  input: Pick<ReleaseInput, 'version' | 'tag' | 'name'>
  versionKeyIncrement: ReleaseType
  logger: Logger
}) => {
  const {
    lastRelease,
    config,
    input,
    logger,
    versionKeyIncrement: _versionKeyIncrement,
  } = params

  logger.info(`Resolving version info based on:`)
  logger.info(`   - last release: ${lastRelease?.tagName || 'none'}`)
  logger.info(
    `   - version input: ${input.version || input.tag || input.name || 'none'}`,
  )
  logger.info(`   - version key increment: ${_versionKeyIncrement}`)

  let _localIncrement: ReleaseType | 'no_increment' =
    structuredClone(_versionKeyIncrement) // local mutable copy

  logger.info(`Coerce and parse versions from last release...`)
  const versionFromLastRelease = new VersionDescriptor(lastRelease, {
    logger,
    tagPrefix: config['tag-prefix'],
    preReleaseIdentifier: config['prerelease-identifier'],
  })
  logger.info(
    `Parsed version from last release: ${versionFromLastRelease.version?.format() || 'none'}.`,
  )

  logger.info(`Coerce and parse versions from input...`)
  const versionFromInput = new VersionDescriptor(
    input.version || input.tag || input.name,
    {
      logger,
      tagPrefix: config['tag-prefix'],
      preReleaseIdentifier: config['prerelease-identifier'],
    },
  )
  logger.info(
    `Parsed version from input: ${versionFromInput.version?.format() || 'none'}.`,
  )

  let referenceVersion: VersionDescriptor
  if (versionFromInput.version) {
    // Use version input
    _localIncrement = 'no_increment' // use that exact input version
    referenceVersion = versionFromInput
  } else if (versionFromLastRelease.version) {
    // Use previous published release
    referenceVersion = versionFromLastRelease

    // Handle prereleases
    const incrementsToPrerelease = _localIncrement?.startsWith('pre')
    const lastReleaseIsPrerelease = referenceVersion?.prerelease?.length
    if (incrementsToPrerelease) {
      if (lastReleaseIsPrerelease) {
        // Set local increment to 'prerelease', so that we simply
        // increment the prerelease number (e.g., 1.2.3-beta.6 -> 1.2.3-beta.7).
        // When publishing prerelease releases, the first published prerelease is supposed to set
        // the stage for the semver increment (e.g. 1.2.2 --(prepatch)--> 1.2.3-beta.0).
        // Subsequent prerelease increments should only increment the prerelease number (e.g. 1.2.3-beta.0 --(prerelease)--> 1.2.3-beta.1).
        // The following increments are considered invalid :
        //    - 1.2.3-beta.1 --(prepatch)--> ??????
        //    - 1.2.3-beta.1 --(preminor)--> ??????
        //    - 1.2.3-beta.1 --(premajor)--> ??????
        if (_localIncrement !== 'prerelease') {
          logger.info(
            `versionKeyIncrement is set to "${_localIncrement}", but the last release is already a prerelease (${referenceVersion.version?.format() || 'none'}). The version will be incremented as a prerelease instead.`,
          )
          _localIncrement = 'prerelease'
        }
      }
    }
  } else {
    // No previous release and no input version
    referenceVersion = new VersionDescriptor('0.0.0', {
      logger,
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
