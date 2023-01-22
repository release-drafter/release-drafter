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
          $RESOLVED: '10.0.3-alpha',
          $INPUT: '10.0.3-alpha',
        },
      },
    ],
  ])(`%s`, (name, { release, template, inputVersion, expected }) => {
    const versionInfo = getVersionInfo(release, template, inputVersion)

    // Next major version checks
    expect(versionInfo.$NEXT_MAJOR_VERSION.version).toEqual(expected.$MAJOR)
    expect(versionInfo.$NEXT_MAJOR_VERSION.template).toEqual(
      '$MAJOR.$MINOR.$PATCH'
    )
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
    expect(versionInfo.$NEXT_MINOR_VERSION.template).toEqual(
      '$MAJOR.$MINOR.$PATCH'
    )
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
    expect(versionInfo.$NEXT_PATCH_VERSION.template).toEqual(
      '$MAJOR.$MINOR.$PATCH'
    )
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

    expect(versionInfo.$NEXT_PATCH_VERSION.version).toEqual(expected.$PATCH)
    expect(versionInfo.$INPUT_VERSION?.version).toEqual(expected.$INPUT)
    expect(versionInfo.$RESOLVED_VERSION.version).toEqual(expected.$RESOLVED)
  })

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
