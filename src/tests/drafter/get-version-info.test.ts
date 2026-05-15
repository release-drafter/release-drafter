import { describe, expect, it } from 'vitest'
import { configSchemaDefaults } from '#src/actions/drafter/config/index.ts'
import { getVersionInfo } from '#src/actions/drafter/lib/build-release-payload/get-version-info.ts'
import type { resolveVersionKeyIncrement } from '#src/actions/drafter/lib/build-release-payload/resolve-version-increment.ts'

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
        `$${'MAJOR' | 'MINOR' | 'PATCH' | 'PRERELEASE' | 'RESOLVED'}`,
        string
      >
    >
  },
]

const suites: SuiteParams[] = [
  [
    'extracts a version-like string from the last tag',
    {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      input: {},
      versionKeyIncrement: 'patch',
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
    "extracts a version-like string from the last release name if the tag isn't a version",
    {
      lastRelease: {
        tag_name: 'notaproperversion',
        name: '10.0.3',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      input: {},
      versionKeyIncrement: 'patch',
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
      lastRelease: {
        tag_name: '10.0.3',
        name: '8.1.0',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      input: {},
      versionKeyIncrement: 'patch',
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
      lastRelease: {
        tag_name: 'v10.0.3-alpha',
        name: 'Some release',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      input: { version: 'v10.0.3-alpha' },
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.3',
        $PRERELEASE: '10.0.3-alpha.0',
        $RESOLVED: '10.0.3-alpha',
      },
    },
  ],
  [
    'handles incremental prereleases',
    {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
        'prerelease-identifier': 'alpha',
      },
      input: {},
      versionKeyIncrement: 'patch',
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
      lastRelease: {
        tag_name: 'v10.0.3-alpha.2',
        name: 'Some release',
      },
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      input: {},
      versionKeyIncrement: 'patch',
      expected: {
        $MAJOR: '11.0.0',
        $MINOR: '10.1.0',
        $PATCH: '10.0.3',
        $PRERELEASE: '10.0.3-alpha.3',
        $RESOLVED: '10.0.3',
      },
    },
  ],
]

describe('versions', () => {
  it.each<SuiteParams>(suites)(`%s`, (_, {
    config,
    expected,
    input,
    lastRelease,
    versionKeyIncrement,
  }) => {
    const versionInfo = getVersionInfo({
      config,
      input,
      lastRelease,
      versionKeyIncrement,
    })

    // Next major version checks
    expect(versionInfo.$NEXT_MAJOR_VERSION).toEqual(expected.$MAJOR)

    // Next minor version checks
    expect(versionInfo.$NEXT_MINOR_VERSION).toEqual(expected.$MINOR)

    // Next patch version checks
    expect(versionInfo.$NEXT_PATCH_VERSION).toEqual(expected.$PATCH)

    // Next prerelease version checks
    expect(versionInfo.$NEXT_PRERELEASE_VERSION).toEqual(expected.$PRERELEASE)

    // Input & Resolved version checks
    expect(versionInfo.$RESOLVED_VERSION).toEqual(expected.$RESOLVED)
  })

  it('returns default version info if no version was found in tag or name', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE' },
      versionKeyIncrement: 'patch',
    })

    expect(versionInfo).toMatchInlineSnapshot(
      `
      {
        "$NEXT_MAJOR_VERSION": "1.0.0",
        "$NEXT_MAJOR_VERSION_MAJOR": "1",
        "$NEXT_MAJOR_VERSION_MINOR": "0",
        "$NEXT_MAJOR_VERSION_PATCH": "0",
        "$NEXT_MINOR_VERSION": "0.2.0",
        "$NEXT_MINOR_VERSION_MAJOR": "0",
        "$NEXT_MINOR_VERSION_MINOR": "2",
        "$NEXT_MINOR_VERSION_PATCH": "0",
        "$NEXT_PATCH_VERSION": "0.1.1",
        "$NEXT_PATCH_VERSION_MAJOR": "0",
        "$NEXT_PATCH_VERSION_MINOR": "1",
        "$NEXT_PATCH_VERSION_PATCH": "1",
        "$NEXT_PRERELEASE_VERSION": "0.1.1-0",
        "$NEXT_PRERELEASE_VERSION_PRERELEASE": "-0",
        "$RESOLVED_VERSION": "0.1.0",
        "$RESOLVED_VERSION_MAJOR": "0",
        "$RESOLVED_VERSION_MINOR": "1",
        "$RESOLVED_VERSION_PATCH": "0",
        "$RESOLVED_VERSION_PRERELEASE": "",
      }
    `,
    )
  })

  it('uses prerelease-identifier on first run when versionKeyIncrement is prerelease-based', () => {
    // Regression test: v7 broke v6 behaviour (PR #1303) where first-run with a
    // prerelease-identifier set produced a bare version (e.g. "0.1.0") instead
    // of a prerelease of the initial version (e.g. "0.1.0-rc.0").
    // semver's prepatch would normally give "0.1.1-rc.0" (increments patch
    // before adding the prerelease suffix), but on first run there is no prior
    // release to increment from, so the result should be "0.1.0-rc.0".
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE',
        'prerelease-identifier': 'rc',
      },
      versionKeyIncrement: 'prepatch',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('0.1.0-rc.0')
    expect(versionInfo.$RESOLVED_VERSION_PRERELEASE).toEqual('-rc.0')
  })

  it('uses prerelease-identifier on first run with custom prerelease identifier', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE',
        'prerelease-identifier': 'beta',
      },
      versionKeyIncrement: 'preminor',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('0.1.0-beta.0')
    expect(versionInfo.$RESOLVED_VERSION_PRERELEASE).toEqual('-beta.0')
  })

  it('uses premajor prerelease-identifier on first run', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH$PRERELEASE',
        'prerelease-identifier': 'rc',
      },
      versionKeyIncrement: 'premajor',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('0.1.0-rc.0')
    expect(versionInfo.$RESOLVED_VERSION_PRERELEASE).toEqual('-rc.0')
  })

  it('still returns bare 0.1.0 on first run when versionKeyIncrement is not prerelease-based', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: {
        'version-template': '$MAJOR.$MINOR.$PATCH',
        'prerelease-identifier': 'rc',
      },
      versionKeyIncrement: 'patch',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('0.1.0')
  })

  it('applies custom version template when no previous releases exist', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '$MAJOR.$MINOR' }, // Custom template - should use MAJOR.MINOR format
      versionKeyIncrement: 'minor',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('0.1')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "0.2"
    expect(versionInfo.$NEXT_MINOR_VERSION).toEqual('0.2')
  })

  it('supports version template with only MINOR.PATCH format', () => {
    const versionInfo = getVersionInfo({
      lastRelease: undefined,
      input: {},
      config: { 'version-template': '$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('1.0')
    // $NEXT_PATCH_VERSION should increment from 0.1.0 to 0.1.1, so formatted as "1.1"
    expect(versionInfo.$NEXT_PATCH_VERSION).toEqual('1.1')
    // $NEXT_MINOR_VERSION should increment from 0.1.0 to 0.2.0, so formatted as "2.0"
    expect(versionInfo.$NEXT_MINOR_VERSION).toEqual('2.0')
  })

  it('supports hardcoded major with 1.MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo({
      lastRelease: {
        tag_name: 'v1.3', // This should be parsed as 1.3.0 internally
        name: 'Some release',
      },
      input: {},
      config: { 'version-template': '1.$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('1.3.1') // From 1.3.0 -> 1.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION).toEqual('1.3.1') // 1.3.0 -> 1.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION).toEqual('1.4.0') // 1.3.0 -> 1.4.0 -> "4.0"
  })

  it('supports MINOR.PATCH format with existing releases', () => {
    const versionInfo = getVersionInfo({
      lastRelease: {
        tag_name: 'v5.3', // This should be parsed as 5.3.0 internally
        name: 'Some release',
      },
      input: {},
      config: { 'version-template': '$MINOR.$PATCH' }, // Custom template - should use MAJOR.MINOR format (no major)
      versionKeyIncrement: 'patch',
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual('3.1') // From 5.3.0 -> 5.3.1 -> formatted as "3.1"
    expect(versionInfo.$NEXT_PATCH_VERSION).toEqual('3.1') // 5.3.0 -> 5.3.1 -> "3.1"
    expect(versionInfo.$NEXT_MINOR_VERSION).toEqual('4.0') // 5.3.0 -> 5.4.0 -> "4.0"
  })

  it.each<[ReturnType<typeof resolveVersionKeyIncrement>, string]>([
    ['patch', '10.0.4'],
    ['minor', '10.1.0'],
    ['major', '11.0.0'],
  ])("when the resolver versionKey increment is '%s'", (versionKey, expected) => {
    const versionInfo = getVersionInfo({
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release',
      },
      input: {},
      config: {
        'version-template': configSchemaDefaults['version-template'],
      },
      versionKeyIncrement: versionKey,
    })

    expect(versionInfo.$RESOLVED_VERSION).toEqual(expected)
  })

  it('uses full semver helper values for default template and token-rendered helper values for custom template', () => {
    const baseParams = {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Some release',
      },
      input: {},
      versionKeyIncrement: 'patch' as const,
    }

    const defaultTemplateVersionInfo = getVersionInfo({
      ...baseParams,
      config: { 'version-template': configSchemaDefaults['version-template'] },
    })

    const customTemplateVersionInfo = getVersionInfo({
      ...baseParams,
      config: { 'version-template': '$MAJOR.$MINOR.$PATCH' },
    })

    expect(defaultTemplateVersionInfo.$NEXT_MAJOR_VERSION).toEqual('11.0.0')
    expect(defaultTemplateVersionInfo.$NEXT_MAJOR_VERSION_MAJOR).toEqual('11')

    expect(customTemplateVersionInfo.$NEXT_MAJOR_VERSION).toEqual('11.0.0')
    expect(customTemplateVersionInfo.$NEXT_MAJOR_VERSION_MAJOR).toEqual('11')
  })

  it('documents version-template behavior: with default template, component helpers are full semver', () => {
    const baseParams = {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Previous release',
      },
      input: {},
      versionKeyIncrement: 'patch' as const,
    }

    const versionInfo = getVersionInfo({
      ...baseParams,
      config: { 'version-template': configSchemaDefaults['version-template'] },
    })

    // With default template, principal variables are full SemVer
    expect(versionInfo.$NEXT_MAJOR_VERSION).toBe('11.0.0')
    expect(versionInfo.$NEXT_MINOR_VERSION).toBe('10.1.0')
    expect(versionInfo.$NEXT_PATCH_VERSION).toBe('10.0.4')

    // Component helpers are also full SemVer with default template
    expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR).toBe('11')
    expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_MINOR_VERSION_MINOR).toBe('1')
    expect(versionInfo.$NEXT_MINOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_PATCH_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_PATCH_VERSION_PATCH).toBe('4')
  })

  it('documents version-template behavior: with $MAJOR.$MINOR template, component helpers are token-rendered', () => {
    const baseParams = {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Previous release',
      },
      input: {},
      versionKeyIncrement: 'patch' as const,
    }

    const versionInfo = getVersionInfo({
      ...baseParams,
      config: { 'version-template': '$MAJOR.$MINOR' },
    })

    // With custom template, principal variables use the template
    expect(versionInfo.$NEXT_MAJOR_VERSION).toBe('11.0')
    expect(versionInfo.$NEXT_MINOR_VERSION).toBe('10.1')
    expect(versionInfo.$NEXT_PATCH_VERSION).toBe('10.0')

    // Component helpers are rendered using their own $* templates
    expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR).toBe('11')
    expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_MINOR_VERSION_MINOR).toBe('1')
    expect(versionInfo.$NEXT_MINOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_PATCH_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_PATCH_VERSION_PATCH).toBe('4')
  })

  it('documents version-template behavior: with $MAJOR template, component helpers are individual numbers', () => {
    const baseParams = {
      lastRelease: {
        tag_name: 'v10.0.3',
        name: 'Previous release',
      },
      input: {},
      versionKeyIncrement: 'patch' as const,
    }

    const versionInfo = getVersionInfo({
      ...baseParams,
      config: { 'version-template': '$MAJOR' },
    })

    // With $MAJOR template, principal variables contain only major version
    expect(versionInfo.$NEXT_MAJOR_VERSION).toBe('11')
    expect(versionInfo.$NEXT_MINOR_VERSION).toBe('10')
    expect(versionInfo.$NEXT_PATCH_VERSION).toBe('10')

    // Component helpers are rendered using their own $* templates
    expect(versionInfo.$NEXT_MAJOR_VERSION_MAJOR).toBe('11')
    expect(versionInfo.$NEXT_MAJOR_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_MAJOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_MINOR_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_MINOR_VERSION_MINOR).toBe('1')
    expect(versionInfo.$NEXT_MINOR_VERSION_PATCH).toBe('0')

    expect(versionInfo.$NEXT_PATCH_VERSION_MAJOR).toBe('10')
    expect(versionInfo.$NEXT_PATCH_VERSION_MINOR).toBe('0')
    expect(versionInfo.$NEXT_PATCH_VERSION_PATCH).toBe('4')
  })
})
