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
          files: ['docs/**'],
          branch: [],
          title: [],
          body: [],
        },
      ],
    })
  })

  it('rejects empty configs and empty matcher values', async () => {
    await expect(parseConfigFile('autolabeler: []')).rejects.toThrow()
    await expect(
      parseConfigFile(`
autolabeler:
  - label: invalid
    title:
      - ''
`),
    ).rejects.toThrow()
  })

  it('compiles regex matchers without mutating parsed config', () => {
    const config = configSchema.parse({
      autolabeler: [
        {
          label: 'feature',
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
