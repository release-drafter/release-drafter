import { describe, expect, it, vi } from 'vitest'
import { configSchema } from '../config/config.schema.ts'
import { mergeInputAndConfig } from '../config/merge-input-and-config.ts'
import { noopLogger } from '../ports.ts'
import { getVersionInfo } from './get-version-info.ts'
import { VersionDescriptor } from './version-descriptor.ts'

const versionTemplate = '$MAJOR.$MINOR.$PATCH$PRERELEASE'
type ReleaseType = Parameters<typeof getVersionInfo>[0]['versionKeyIncrement']

const describeVersion = (
  from: ConstructorParameters<typeof VersionDescriptor>[0],
  options: Partial<ConstructorParameters<typeof VersionDescriptor>[1]> = {},
) =>
  new VersionDescriptor(from, {
    logger: noopLogger,
    ...options,
  })

const renderedVersion = (descriptor: VersionDescriptor) =>
  descriptor.rendered(versionTemplate)

describe('version semantic parity', () => {
  describe('Release Drafter parsing and coercion', () => {
    it.each([
      ['1.2.3', '1.2.3'],
      ['v1.2.3', '1.2.3'],
      ['release-1.2.3', '1.2.3'],
      ['1.2', '1.2.0'],
      ['^1.2.3', '1.2.3'],
      ['1.2.x', '1.2.0'],
      ['>=1.2.3 <2.0.0', '1.2.3'],
      ['1.2.3-beta.2+build.7', '1.2.3-beta.2'],
    ])('normalizes %j to %s', (input, expected) => {
      const descriptor = describeVersion(input)

      expect(renderedVersion(descriptor)).toBe(expected)
      expect({
        major: descriptor.major,
        minor: descriptor.minor,
        patch: descriptor.patch,
        prerelease: descriptor.prerelease,
      }).toEqual({
        major: expected.split('.')[0],
        minor: expected.split('.')[1],
        patch: expected.split('.')[2]?.split('-')[0],
        prerelease: expected.includes('-')
          ? `-${expected.split('-').slice(1).join('-')}`
          : '',
      })
    })

    it.each([
      undefined,
      '',
      'not-a-version',
      '*',
    ])('keeps nullable outputs for unparseable input %j', (input) => {
      const warning = vi.fn()
      const descriptor = new VersionDescriptor(input, {
        logger: { ...noopLogger, warning },
      })

      expect(descriptor.version).toBeNull()
      expect(descriptor.major).toBeNull()
      expect(descriptor.minor).toBeNull()
      expect(descriptor.patch).toBeNull()
      expect(descriptor.prerelease).toBeNull()
      expect(warning).toHaveBeenCalledTimes(input ? 1 : 0)
    })

    it('prefers a prefixed release tag and falls back to its name', () => {
      const tagged = describeVersion(
        { tagName: 'release-2.4.6', name: '9.9.9' },
        { tagPrefix: 'release-' },
      )
      const fallback = describeVersion(
        { tagName: 'not-a-version', name: 'release-3.5.7-rc.1' },
        { tagPrefix: 'release-' },
      )

      expect(renderedVersion(tagged)).toBe('2.4.6')
      expect(renderedVersion(fallback)).toBe('3.5.7-rc.1')
    })
  })

  describe('Release Drafter range validation', () => {
    const parseConfigWithRange = (range: string) =>
      mergeInputAndConfig({
        config: configSchema.parse({
          commitish: 'main',
          template: '$CHANGES',
          'filter-by-range': range,
        }),
        input: {},
        logger: noopLogger,
      })

    it.each([
      '^1.2.3',
      '1.x',
      '>=1.2.3-rc.1 <2.0.0',
    ])('accepts the valid range %s', (range) => {
      expect(parseConfigWithRange(range)['filter-by-range']).toBe(range)
    })

    it.each([
      'not a range',
      '1.2.3 -',
      '>=1.2.3 <',
    ])('rejects the invalid range %s', (range) => {
      expect(() => parseConfigWithRange(range)).toThrow(
        `'filter-by-range' value "${range}" could not be parsed as a valid semver range.`,
      )
    })
  })

  describe('Release Drafter increments', () => {
    const increments: Array<[ReleaseType, string]> = [
      ['major', '2.0.0'],
      ['minor', '1.3.0'],
      ['patch', '1.2.4'],
      ['premajor', '2.0.0-rc.0'],
      ['preminor', '1.3.0-rc.0'],
      ['prepatch', '1.2.4-rc.0'],
      ['prerelease', '1.2.4-rc.0'],
    ]

    it.each(increments)('resolves %s releases', (increment, expected) => {
      const info = getVersionInfo({
        lastRelease: { tagName: 'v1.2.3', name: 'Release 1.2.3' },
        config: {
          'version-template': versionTemplate,
          'prerelease-identifier': 'rc',
        },
        input: {},
        versionKeyIncrement: increment,
        logger: noopLogger,
      })

      expect(info.$RESOLVED_VERSION).toBe(expected)
      expect(
        `${info.$RESOLVED_VERSION_MAJOR}.${info.$RESOLVED_VERSION_MINOR}.${info.$RESOLVED_VERSION_PATCH}${info.$RESOLVED_VERSION_PRERELEASE}`,
      ).toBe(expected)
    })

    it.each([
      ['alpha', '1.2.4-alpha.0'],
      ['beta', '1.2.4-beta.0'],
      ['rc', '1.2.4-rc.0'],
    ])('preserves the %s prerelease identifier', (identifier, expected) => {
      const descriptor = describeVersion('1.2.3', {
        preReleaseIdentifier: identifier,
      })

      expect(renderedVersion(descriptor.incremented('prerelease'))).toBe(
        expected,
      )
    })

    it('advances an existing prerelease instead of restarting its base increment', () => {
      const info = getVersionInfo({
        lastRelease: { tagName: 'v1.2.3-beta.6', name: 'Beta 6' },
        config: {
          'version-template': versionTemplate,
          'prerelease-identifier': 'beta',
        },
        input: {},
        versionKeyIncrement: 'preminor',
        logger: noopLogger,
      })

      expect(info.$RESOLVED_VERSION).toBe('1.2.3-beta.7')
      expect(info.$RESOLVED_VERSION_PRERELEASE).toBe('-beta.7')
    })
  })

  describe('VersionDescriptor outputs and mutation boundaries', () => {
    it('exposes rendered parts without mutating the source descriptor', () => {
      const original = describeVersion('v1.2.3-beta.2', {
        preReleaseIdentifier: 'beta',
        tagPrefix: 'v',
      })
      const incremented = original.incremented('prerelease')

      expect(incremented).not.toBe(original)
      expect(renderedVersion(original)).toBe('1.2.3-beta.2')
      expect(renderedVersion(incremented)).toBe('1.2.3-beta.3')
      expect(incremented).toMatchObject({
        major: '1',
        minor: '2',
        patch: '3',
        prerelease: '-beta.3',
        preReleaseIdentifier: 'beta',
        tagPrefix: 'v',
      })
    })

    it('uses the exact input version and leaves increment selection unmodified', () => {
      const original = describeVersion('2.3.4-rc.5')

      expect(original.incremented('no_increment')).toBe(original)

      const info = getVersionInfo({
        lastRelease: { tagName: 'v1.0.0', name: 'Old release' },
        config: { 'version-template': versionTemplate },
        input: { version: '2.3.4-rc.5' },
        versionKeyIncrement: 'major',
        logger: noopLogger,
      })

      expect(info.$RESOLVED_VERSION).toBe('2.3.4-rc.5')
      expect(info.$NEXT_MAJOR_VERSION).toBe('3.0.0')
      expect(info.$NEXT_MINOR_VERSION).toBe('2.4.0')
      expect(info.$NEXT_PATCH_VERSION).toBe('2.3.4')
      expect(info.$NEXT_PRERELEASE_VERSION).toBe('2.3.4-rc.6')
    })
  })
})
