import { describe, expect, it, vi } from 'vitest'
import { commonConfigSchema } from './common-config.schema.ts'
import { configSchema } from './config.schema.ts'
import { mergeInputAndConfig } from './merge-input-and-config.ts'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}

describe('release-mode normalization', () => {
  it.each([
    {
      name: 'config identifier and explicit latest',
      config: { latest: true, 'prerelease-identifier': 'beta' },
      input: {},
      warns: true,
    },
    {
      name: 'config identifier and default latest',
      config: { 'prerelease-identifier': 'beta' },
      input: {},
      warns: false,
    },
    {
      name: 'input identifier and explicit latest',
      config: { latest: true },
      input: { 'prerelease-identifier': 'rc' },
      warns: true,
    },
    {
      name: 'input identifier and default latest',
      config: {},
      input: { 'prerelease-identifier': 'rc' },
      warns: false,
    },
    {
      name: 'input prerelease and default latest',
      config: {},
      input: { prerelease: true },
      warns: false,
    },
    {
      name: 'config prerelease and default latest',
      config: { prerelease: true },
      input: {},
      warns: false,
    },
    {
      name: 'input latest true overriding config latest false',
      config: { prerelease: true, latest: false },
      input: { latest: true },
      warns: true,
    },
    {
      name: 'input latest false overriding config latest true',
      config: { prerelease: true, latest: true },
      input: { latest: false },
      warns: false,
    },
    {
      name: 'input identifier despite input prerelease false',
      config: { latest: true },
      input: { prerelease: false, 'prerelease-identifier': 'rc' },
      warns: true,
    },
  ])('never marks a prerelease latest: $name', ({ config, input, warns }) => {
    const original = configSchema.parse({
      template: '$CHANGES',
      commitish: 'main',
      ...config,
    })
    const result = mergeInputAndConfig({
      config: original,
      input: commonConfigSchema.parse(input),
      logger,
    })
    expect(result).toMatchObject({ prerelease: true, latest: false })
    expect(original.latest).toBe(config.latest)
    const conflictWarning = expect.stringContaining(
      "'prerelease' and 'latest' cannot be both true",
    )
    if (warns) {
      expect(logger.warning).toHaveBeenCalledWith(conflictWarning)
    } else {
      expect(logger.warning).not.toHaveBeenCalledWith(conflictWarning)
    }
  })

  it('keeps an explicit stable-release input authoritative over a config identifier', () => {
    const result = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        latest: true,
        'prerelease-identifier': 'beta',
      }),
      input: commonConfigSchema.parse({ prerelease: false }),
      logger,
    })
    expect(result).toMatchObject({ prerelease: false, latest: true })
    expect(logger.warning).not.toHaveBeenCalled()
  })

  it('keeps an explicit latest false without a conflict warning', () => {
    const result = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        prerelease: true,
        latest: false,
      }),
      input: commonConfigSchema.parse({}),
      logger,
    })
    expect(result).toMatchObject({ prerelease: true, latest: false })
    expect(logger.warning).not.toHaveBeenCalled()
  })
})

describe('parsed configuration validation', () => {
  it.each([
    { config: {}, error: "'commitish' is required" },
    {
      config: {
        commitish: 'main',
        categories: [{ when: { label: 'feature' } }],
      },
      error: 'non-empty',
    },
    {
      config: {
        commitish: 'main',
        categories: [{ title: 'One' }, { title: 'Two' }],
      },
      error: 'Only one such category',
    },
    {
      config: { commitish: 'main', 'filter-by-range': 'not a range' },
      error: 'valid semver range',
    },
  ])('rejects invalid parsed configuration: $error', ({ config, error }) => {
    expect(() =>
      mergeInputAndConfig({
        config: configSchema.parse(config),
        input: commonConfigSchema.parse({}),
        logger,
      }),
    ).toThrow(error)
  })

  it('uses the default branch when no commitish was configured', () => {
    expect(
      mergeInputAndConfig({
        config: configSchema.parse({}),
        input: commonConfigSchema.parse({}),
        defaultCommitish: 'trunk',
        logger,
      }).commitish,
    ).toBe('trunk')
  })
})
