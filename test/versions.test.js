const { test } = require('@jest/globals')

const { getVersionInfo, defaultVersionInfo } = require('../lib/versions')

describe('versions', () => {
  test.each([
    [
      'extracts a version-like string from the last tag',
      {
        release: {
          tag_name: 'v10.0.3',
          name: 'Some release',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.4',
          $PRERELEASE: '10.0.4-0',
          $RESOLVED: '10.0.4',
        },
      },
    ],
    [
      'extracts a version-like string from the last release name if the tag isnt a version',
      {
        release: {
          tag_name: 'notaproperversion',
          name: '10.0.3',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.4',
          $RESOLVED: '10.0.4',
          $PRERELEASE: '10.0.4-0',
        },
      },
    ],
    [
      'preferences tags over release names',
      {
        release: {
          tag_name: '10.0.3',
          name: '8.1.0',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.4',
          $PRERELEASE: '10.0.4-0',
          $RESOLVED: '10.0.4',
        },
      },
    ],
    [
      'handles alpha/beta releases',
      {
        release: {
          tag_name: 'v10.0.3-alpha',
          name: 'Some release',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        inputVersion: 'v10.0.3-alpha',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.3',
          $PRERELEASE: '10.0.3-alpha.0',
          $RESOLVED: '10.0.3-alpha',
          $INPUT: '10.0.3-alpha',
        },
      },
    ],
    [
      'handles incremental prereleases',
      {
        release: {
          tag_name: 'v10.0.3',
          name: 'Some release',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        preReleaseIdentifier: 'alpha',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.4',
          $PRERELEASE: '10.0.4-alpha.0',
          $RESOLVED: '10.0.4',
        },
      },
    ],
    [
      'handles incremental prereleases on existing prereleases',
      {
        release: {
          tag_name: 'v10.0.3-alpha.2',
          name: 'Some release',
        },
        template: '$MAJOR.$MINOR.$PATCH',
        expected: {
          $MAJOR: '11.0.0',
          $MINOR: '10.1.0',
          $PATCH: '10.0.3',
          $PRERELEASE: '10.0.3-alpha.3',
          $RESOLVED: '10.0.3',
        },
      },
    ],
  ])(
    `%s`,
    (
      name,
      { release, template, inputVersion, preReleaseIdentifier, expected }
    ) => {
      const versionInfo = getVersionInfo(
        release,
        template,
        inputVersion,
        undefined,
        undefined,
        preReleaseIdentifier
      )

      // Next major version checks
      expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual(expected.$MAJOR)
      expect(versionInfo.$NEXT_MAJOR_VERSION.template).toEqual(template)
      expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH.template).toEqual('$PATCH')

      // Next minor version checks
      expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual(expected.$MINOR)
      expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual(template)
      expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_MINOR_VERSION_MINOR.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_MINOR.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_MINOR_VERSION_PATCH.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_PATCH.template).toEqual('$PATCH')

      // Next patch version checks
      expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual(expected.$PATCH)
      expect(versionInfo.$NEXT_PATCH_VERSION.template).toEqual(template)
      expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_PATCH_VERSION_MINOR.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_MINOR.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_PATCH_VERSION_PATCH.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_PATCH.template).toEqual('$PATCH')

      // Next prerelease version checks
      expect(versionInfo.$NEXT_PRERELEASE_VERSION.version).toEqual(
        expected.$PRERELEASE
      )
      expect(versionInfo.$NEXT_PRERELEASE_VERSION.template).toEqual(
        '$PRERELEASE'
      )

      // Input & Resolved version checks
      expect(versionInfo.$INPUT_VERSION?.version).toEqual(expected.$INPUT)
      expect(versionInfo.$RESOLVED_VERSION.version).toEqual(expected.$RESOLVED)
    }
  )

  it('returns default version info if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({})

    expect(versionInfo).toEqual(defaultVersionInfo)
  })

  it.each([
    ['patch', '10.0.4'],
    ['minor', '10.1.0'],
    ['major', '11.0.0'],
  ])(
    "when the resolver versionKey increment is '%s'",
    (versionKey, expected) => {
      const versionInfo = getVersionInfo(
        {
          tag_name: 'v10.0.3',
          name: 'Some release',
        },
        null,
        null,
        versionKey
      )
      expect(versionInfo.$RESOLVED_VERSION.version).toEqual(expected)
    }
  )
})
