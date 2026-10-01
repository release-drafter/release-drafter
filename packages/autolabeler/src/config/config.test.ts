import { describe, expect, it, vi } from 'vitest'
import { configSchema } from './config.schema.ts'
import { parseConfig } from './parse-config.ts'
import { parseConfigFile } from './parse-config-file.ts'

describe('autolabeler config', () => {
  it('parses YAML and applies matcher defaults', async () => {
    await expect(
      parseConfigFile(`
autolabeler:
  - label: documentation
    files:
      - docs/**
`),
    ).resolves.toEqual({
      autolabeler: [
        {
          label: 'documentation',
          'stop-on-match': false,
          fallback: false,
          files: ['docs/**'],
          branch: [],
          title: [],
          body: [],
        },
      ],
    })
  })

  it('accepts an empty rule list or a fallback-only configuration', async () => {
    await expect(parseConfigFile('autolabeler: []')).resolves.toEqual({
      autolabeler: [],
    })
    await expect(
      parseConfigFile(
        'autolabeler:\n  - labels: [needs-triage, uncategorized]\n    fallback: true',
      ),
    ).resolves.toMatchObject({
      autolabeler: [
        { labels: ['needs-triage', 'uncategorized'], fallback: true },
      ],
    })
  })

  it('rejects missing rules and empty matcher values', async () => {
    await expect(parseConfigFile('{}')).rejects.toThrow()
    await expect(
      parseConfigFile(`
autolabeler:
  - label: invalid
    title:
      - ''
`),
    ).rejects.toThrow()
  })

  it('parses multiple labels and an explicit stop option', async () => {
    await expect(
      parseConfigFile(`
autolabeler:
  - labels: [chore, documentation]
    stop-on-match: true
    files: [docs/**]
`),
    ).resolves.toMatchObject({
      autolabeler: [
        { labels: ['chore', 'documentation'], 'stop-on-match': true },
      ],
    })
  })

  it.each(
    ['', [], ['valid'], [''], ['valid', ''], [42], null, 42].map((label) => ({
      label,
    })),
  )('rejects invalid label configuration $label', ({ label }) => {
    expect(() => configSchema.parse({ autolabeler: [{ label }] })).toThrow()
  })

  it.each(
    ['', [], [''], ['valid', ''], [42], null, 42].map((labels) => ({ labels })),
  )(
    'rejects invalid labels configuration $labels even with a valid scalar label',
    ({ labels }) => {
      expect(() => configSchema.parse({ autolabeler: [{ labels }] })).toThrow()
      expect(() =>
        configSchema.parse({ autolabeler: [{ labels, label: 'valid' }] }),
      ).toThrow()
    },
  )

  it('requires labels or the backward-compatible label option', () => {
    expect(() =>
      configSchema.parse({ autolabeler: [{ files: ['docs/**'] }] }),
    ).toThrow()
  })

  it('rejects an invalid scalar label even with a valid labels list', () => {
    expect(() =>
      configSchema.parse({ autolabeler: [{ labels: ['valid'], label: '' }] }),
    ).toThrow()
  })

  it('normalizes the scalar label and combines both forms without mutating config', () => {
    const config = configSchema.parse({
      autolabeler: [
        { label: 'legacy' },
        { labels: ['canonical'] },
        { labels: ['canonical', 'legacy'], label: 'legacy' },
      ],
    })
    const original = structuredClone(config)
    const parsed = parseConfig({ config, logger: { warning: vi.fn() } })

    expect(config).toEqual(original)
    expect(parsed.autolabeler.map(({ labels }) => labels)).toEqual([
      ['legacy'],
      ['canonical'],
      ['canonical', 'legacy', 'legacy'],
    ])
  })

  it.each(['', [], null, 42].map((fallback) => ({ fallback })))(
    'rejects invalid fallback $fallback',
    ({ fallback }) => {
      expect(() =>
        configSchema.parse({
          autolabeler: [{ labels: ['needs-triage'], fallback }],
        }),
      ).toThrow()
    },
  )

  it.each([
    {
      name: 'multiple fallback rules',
      rules: [
        { label: 'one', fallback: true },
        { labels: ['two'], fallback: true },
      ],
      error: 'Only one Autolabeler fallback rule is supported.',
    },
    {
      name: 'fallback and stop-on-match',
      rules: [
        { labels: ['needs-triage'], fallback: true, 'stop-on-match': true },
      ],
      error:
        "An Autolabeler rule cannot enable both 'fallback' and 'stop-on-match'.",
    },
    ...['files', 'branch', 'title', 'body'].map((matcher) => ({
      name: `fallback with ${matcher} matchers`,
      rules: [
        { labels: ['needs-triage'], fallback: true, [matcher]: ['pattern'] },
      ],
      error: 'An Autolabeler fallback rule must not specify matchers.',
    })),
  ])(
    'rejects $name in both config parsing entrypoints',
    async ({ rules, error }) => {
      const config = configSchema.parse({ autolabeler: rules })
      expect(() =>
        parseConfig({ config, logger: { warning: vi.fn() } }),
      ).toThrow(error)
      await expect(
        parseConfigFile(JSON.stringify({ autolabeler: rules })),
      ).rejects.toThrow(error)
    },
  )

  it('rejects a nonboolean stop option', () => {
    expect(() =>
      configSchema.parse({
        autolabeler: [{ label: 'bug', 'stop-on-match': 'true' }],
      }),
    ).toThrow()
  })

  it('compiles regex matchers without mutating parsed config', () => {
    const config = configSchema.parse({
      autolabeler: [
        {
          labels: ['feature', 'core'],
          'stop-on-match': true,
          files: ['src/**'],
          branch: ['/feature\\/.+/i'],
          title: ['feat(core)'],
          body: ['/breaking/i'],
        },
      ],
    })
    const original = structuredClone(config)
    const parsed = parseConfig({
      config,
      logger: { warning: vi.fn() },
    })

    expect(config).toEqual(original)
    expect(parsed.autolabeler[0]?.labels).toEqual(['feature', 'core'])
    expect(parsed.autolabeler[0]?.['stop-on-match']).toBe(true)
    expect(parsed.autolabeler[0]?.files).toEqual(['src/**'])
    expect(parsed.autolabeler[0]?.branch[0]).toEqual(/feature\/.+/i)
    expect(parsed.autolabeler[0]?.title[0]).toEqual(/feat\(core\)/g)
    expect(parsed.autolabeler[0]?.body[0]).toEqual(/breaking/i)
  })

  it('drops only rules containing an invalid regex and reports legacy warning text', () => {
    const warning = vi.fn()
    const config = configSchema.parse({
      autolabeler: [
        { label: 'broken', branch: ['/[/'], title: ['feat'], body: ['body'] },
        { label: 'valid', title: ['/fix/i'] },
      ],
    })

    const parsed = parseConfig({ config, logger: { warning } })

    expect(parsed.autolabeler.map(({ label }) => label)).toEqual(['valid'])
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "Bad autolabeler regex: '/[/', 'feat' or 'body'",
    )
  })
})
