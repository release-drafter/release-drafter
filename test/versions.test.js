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

  it('applies custom version template when no previous releases exist', () => {
    const versionInfo = getVersionInfo(
      null,
      '$MAJOR.$MINOR', // Custom template - should use MAJOR.MINOR format
      null,
      'minor'
    )

    expect(versionInfo.$RESOLVED_VERSION.template).toEqual('$MAJOR.$MINOR')
    expect(versionInfo.$RESOLVED_VERSION.version).toEqual('0.1')
    expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual('$MAJOR.$MINOR')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "0.2"
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('0.2')
  })

  it('supports version template with only MINOR.PATCH format', () => {
    const versionInfo = getVersionInfo(
      null,
      '$MINOR.$PATCH', // Custom template - should use MINOR.PATCH format (no major)
      null,
      'patch'
    )

    expect(versionInfo.$RESOLVED_VERSION.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION.version).toEqual('1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION.template).toEqual('$MINOR.$PATCH')
    // $NEXT_PATCH_VERSION should increment from 0.1.0 to 0.1.1, so formatted as "1.1"
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('1.1')
    expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual('$MINOR.$PATCH')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "2.0"
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('2.0')
  })

  it('supports hardcoded major with 1.MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo(
      {
        tag_name: 'v1.3', // This should be parsed as 1.3.0 internally
        name: 'Some release',
      },
      '1.$MINOR.$PATCH', // Custom template - should use MINOR.PATCH format (no major)
      null,
      'patch'
    )

    expect(versionInfo.$RESOLVED_VERSION.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION.version).toEqual('1.3.1') // From 1.3.0 -> 1.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('1.3.1') // 1.3.0 -> 1.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('1.4.0') // 1.3.0 -> 1.4.0 -> "4.0"
  })

  it('supports MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo(
      {
        tag_name: 'v5.3', // This should be parsed as 5.3.0 internally
        name: 'Some release',
      },
      '$MINOR.$PATCH', // Custom template - should use MINOR.PATCH format (no major)
      null,
      'patch'
    )

    expect(versionInfo.$RESOLVED_VERSION.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION.version).toEqual('3.1') // From 5.3.0 -> 5.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual('3.1') // 5.3.0 -> 5.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$NEXT_MINOR_VERSION.version).toEqual('4.0') // 5.3.0 -> 5.4.0 -> "4.0"
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
