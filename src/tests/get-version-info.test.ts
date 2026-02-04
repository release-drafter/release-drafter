import {
  defaultVersionInfo,
  getVersionInfo
} from 'src/actions/drafter/lib/build-release-payload/get-version-info'
import { resolveVersionKeyIncrement } from 'src/actions/drafter/lib/build-release-payload/resolve-version-increment'
import { describe, expect, it } from 'vitest'

type SuiteParams = [
  string,
  Omit<Parameters<typeof getVersionInfo>[0], 'lastRelease'> & {
    lastRelease:
      | Pick<
          Exclude<
            Parameters<typeof getVersionInfo>[0]['lastRelease'],
            undefined
          >,
          'tag_name' | 'name'
        >
      | undefined
    expected: Partial<
      Record<
        `$${'MAJOR' | 'MINOR' | 'PATCH' | 'PRERELEASE' | 'RESOLVED' | 'INPUT'}`,
        string
      >
    >
  }
]

const suites: SuiteParams[] = [
  [
    'extracts a version-like string from the last tag',
    {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH'
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.4',
        $PRERELEASE: '10.0.4-0',
        $RESOLVED: '10.0.4'
      }
    }
  ],
  [
    'extracts a version-like string from the last release name if the tag isnt a version',
    {
      lastRelease: {
        tag_name: 'notaproperversion',
        name: '10.0.3'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH'
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.4',
        $RESOLVED: '10.0.4',
        $PRERELEASE: '10.0.4-0'
      }
    }
  ],
  [
    'preferences tags over release names',
    {
      lastRelease: {
        tag_name: '10.0.3',
        name: '8.1.0'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH'
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.4',
        $PRERELEASE: '10.0.4-0',
        $RESOLVED: '10.0.4'
      }
    }
  ],
  [
    'handles alpha/beta releases',
    {
      lastRelease: {
        tag_name: 'v10.0.3-alpha',
        name: 'Some release'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH'
      },
      input: { version: 'v10.0.3-alpha' },
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.3',
        $PRERELEASE: '10.0.3-alpha.0',
        $RESOLVED: '10.0.3-alpha',
        $INPUT: '10.0.3-alpha'
      }
    }
  ],
  [
    'handles incremental prereleases',
    {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH',
        'prerelease-identifier': 'alpha'
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.4',
        $PRERELEASE: '10.0.4-alpha.0',
        $RESOLVED: '10.0.4'
      }
    }
  ],
  [
    'handles incremental prereleases on existing prereleases',
    {
      lastRelease: {
        tag_name: 'v10.0.3-alpha.2',
        name: 'Some release'
      },
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH'
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.3',
        $PRERELEASE: '10.0.3-alpha.3',
        $RESOLVED: '10.0.3'
      }
    }
  ]
]

describe('versions', () => {
  it.each<SuiteParams>(suites)(
    `%s`,
    (_, { config, expected, input, lastRelease, versionKeyIncrement }) => {
      const versionInfo = getVersionInfo({
        config,
        input,
        lastRelease,
        versionKeyIncrement
      })

      // Next major version checks
      expect(versionInfo.$NEXT_MAJOR_VERSION?.version).toEqual(expected.$MAJOR)
      expect(versionInfo.$NEXT_MAJOR_VERSION?.template).toEqual(
        config['version-template']
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR?.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR?.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR?.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR?.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH?.version).toEqual(
        expected.$MAJOR
      )
      expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH?.template).toEqual('$PATCH')

      // Next minor version checks
      expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual(expected.$MINOR)
      expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual(
        config['version-template']
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR?.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR?.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_MINOR_VERSION_MINOR?.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_MINOR?.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_MINOR_VERSION_PATCH?.version).toEqual(
        expected.$MINOR
      )
      expect(versionInfo.$NEXT_MINOR_VERSION_PATCH?.template).toEqual('$PATCH')

      // Next patch version checks
      expect(versionInfo.$NEXT_PATCH_VERSION?.version).toEqual(expected.$PATCH)
      expect(versionInfo.$NEXT_PATCH_VERSION?.template).toEqual(
        config['version-template']
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR?.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR?.template).toEqual('$MAJOR')
      expect(versionInfo.$NEXT_PATCH_VERSION_MINOR?.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_MINOR?.template).toEqual('$MINOR')
      expect(versionInfo.$NEXT_PATCH_VERSION_PATCH?.version).toEqual(
        expected.$PATCH
      )
      expect(versionInfo.$NEXT_PATCH_VERSION_PATCH?.template).toEqual('$PATCH')

      // Next prerelease version checks
      expect(versionInfo.$NEXT_PRERELEASE_VERSION?.version).toEqual(
        expected.$PRERELEASE
      )
      expect(versionInfo.$NEXT_PRERELEASE_VERSION?.template).toEqual(
        '$PRERELEASE'
      )

      // Input & Resolved version checks
      expect(versionInfo.$INPUT_VERSION?.version).toEqual(expected.$INPUT)
      expect(versionInfo.$RESOLVED_VERSION?.version).toEqual(expected.$RESOLVED)
    }
  )

  it('returns default version info if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '' },
      versionKeyIncrement: 'patch'
    })

    expect(versionInfo).toEqual(defaultVersionInfo)
  })

  it('applies custom version template when no previous releases exist', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '$MAJOR.$MINOR' }, // Custom template - should use MAJOR.MINOR format
      versionKeyIncrement: 'minor'
    })

    expect(versionInfo.$RESOLVED_VERSION?.template).toEqual('$MAJOR.$MINOR')
    expect(versionInfo.$RESOLVED_VERSION?.version).toEqual('0.1')
    expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual('$MAJOR.$MINOR')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "0.2"
    expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual('0.2')
  })

  it('supports version template with only MINOR.PATCH format', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch'
    })

    expect(versionInfo.$RESOLVED_VERSION?.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION?.version).toEqual('1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION?.template).toEqual('$MINOR.$PATCH')
    // $NEXT_PATCH_VERSION should increment from 0.1.0 to 0.1.1, so formatted as "1.1"
    expect(versionInfo.$NEXT_PATCH_VERSION?.version).toEqual('1.1')
    expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual('$MINOR.$PATCH')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "2.0"
    expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual('2.0')
  })

  it('supports hardcoded major with 1.MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo({
      lastRelease: {
        tag_name: 'v1.3', // This should be parsed as 1.3.0 internally
        name: 'Some release'
      },
      input: {},
      config: { 'version-template': '1.$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch'
    })

    expect(versionInfo.$RESOLVED_VERSION?.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION?.version).toEqual('1.3.1') // From 1.3.0 -> 1.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION?.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$NEXT_PATCH_VERSION?.version).toEqual('1.3.1') // 1.3.0 -> 1.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual('1.$MINOR.$PATCH')
    expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual('1.4.0') // 1.3.0 -> 1.4.0 -> "4.0"
  })

  it('supports MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo({
      lastRelease: {
        tag_name: 'v5.3', // This should be parsed as 5.3.0 internally
        name: 'Some release'
      },
      input: {},
      config: { 'version-template': '$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch'
    })

    expect(versionInfo.$RESOLVED_VERSION?.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$RESOLVED_VERSION?.version).toEqual('3.1') // From 5.3.0 -> 5.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION?.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$NEXT_PATCH_VERSION?.version).toEqual('3.1') // 5.3.0 -> 5.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION?.template).toEqual('$MINOR.$PATCH')
    expect(versionInfo.$NEXT_MINOR_VERSION?.version).toEqual('4.0') // 5.3.0 -> 5.4.0 -> "4.0"
  })

  it.each<[ReturnType<typeof resolveVersionKeyIncrement>, string]>([
    ['patch', '10.0.4'],
    ['minor', '10.1.0'],
    ['major', '11.0.0']
  ])(
    "when the resolver versionKey increment is '%s'",
    (versionKey, expected) => {
      const versionInfo = getVersionInfo({
        lastRelease: {
          tag_name: 'v10.0.3',
          name: 'Some release'
        },
        input: {},
        config: { 'version-template': '$MAJOR.$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
        versionKeyIncrement: versionKey
      })

      expect(versionInfo.$RESOLVED_VERSION?.version).toEqual(expected)
    }
  )
})
