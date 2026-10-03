import { describe, expect, it, vi } from 'vitest'
import { noopLogger } from '../ports.ts'
import { configSchema } from './config.schema.ts'
import { mergeInputAndConfig } from './merge-input-and-config.ts'

describe('replacer configuration', () => {
  it('preserves targets while compiling regex and literal searches', () => {
    const config = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        template: '$CHANGES',
        replacers: [
          { search: 'literal.*', replace: '' },
          { target: 'global', search: '/value/g', replace: 'new' },
          { target: 'change-body', search: '/<!--.*?-->/gs', replace: '' },
          { target: 'change-title', search: '/^feat: /', replace: '' },
        ],
      }),
      input: {},
      logger: noopLogger,
    })

    expect(config.replacers).toEqual([
      { search: /literal\.\*/g, replace: '' },
      { target: 'global', search: /value/g, replace: 'new' },
      { target: 'change-body', search: /<!--.*?-->/gs, replace: '' },
      { target: 'change-title', search: /^feat: /, replace: '' },
    ])
  })

  it.each(['unknown', '', null, 42])('rejects target %j', (target) => {
    expect(() =>
      configSchema.parse({
        template: '$CHANGES',
        replacers: [{ search: 'value', replace: '', target }],
      }),
    ).toThrow()
  })

  it('warns and skips an invalid body regex while keeping valid rules', () => {
    const warning = vi.fn()
    const config = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        template: '$CHANGES',
        replacers: [
          { target: 'change-body', search: '/[/g', replace: '' },
          { target: 'change-body', search: 'value', replace: 'new' },
        ],
      }),
      input: {},
      logger: { ...noopLogger, warning },
    })

    expect(warning).toHaveBeenCalledExactlyOnceWith(
      "Bad replacer regex: '/[/g'",
    )
    expect(config.replacers).toEqual([
      { target: 'change-body', search: /value/g, replace: 'new' },
    ])
  })
})
