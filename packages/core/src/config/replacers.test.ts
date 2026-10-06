import { describe, expect, it, vi } from 'vitest'
import { noopLogger } from '../ports.ts'
import { configSchema } from './config.schema.ts'
import { mergeInputAndConfig } from './merge-input-and-config.ts'

describe('replacer configuration', () => {
  it('preserves section rules without compiling a regex', () => {
    const config = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        template: '$CHANGES',
        replacers: [
          {
            target: 'change-body',
            section: '## Release information',
            'not-found': 'empty',
          },
        ],
      }),
      input: {},
      logger: noopLogger,
    })
    expect(config.replacers).toEqual([
      {
        target: 'change-body',
        section: '## Release information',
        'not-found': 'empty',
      },
    ])
  })

  it.each([
    { section: '## Notes' },
    { target: 'global', section: '## Notes' },
    { target: 'change-title', section: '## Notes' },
    {
      target: 'change-body',
      section: '## Notes',
      search: 'notes',
      replace: '',
    },
    { target: 'change-body', section: '## Notes', replace: '' },
    { target: 'change-body', section: '## Notes', search: 'notes' },
    ...[
      '',
      'Notes',
      '####### Notes',
      '##',
      '## ###',
      '## Notes\nExtra',
      42,
      null,
    ].map((section) => ({ target: 'change-body', section })),
  ])('rejects an invalid or ambiguous section rule %j', (rule) => {
    expect(() =>
      configSchema.parse({ template: '$CHANGES', replacers: [rule] }),
    ).toThrow()
  })
  it('preserves targets while compiling regex and literal searches', () => {
    const config = mergeInputAndConfig({
      config: configSchema.parse({
        commitish: 'main',
        template: '$CHANGES',
        replacers: [
          { search: 'literal.*', replace: '' },
          { target: 'global', search: '/value/g', replace: 'new' },
          {
            target: 'change-body',
            search: '/<!--.*?-->/gs',
            replace: '',
            'not-found': 'empty',
          },
          { target: 'change-title', search: '/^feat: /', replace: '' },
        ],
      }),
      input: {},
      logger: noopLogger,
    })

    expect(config.replacers).toEqual([
      { search: /literal\.\*/g, replace: '' },
      { target: 'global', search: /value/g, replace: 'new' },
      {
        target: 'change-body',
        search: /<!--.*?-->/gs,
        replace: '',
        'not-found': 'empty',
      },
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

  it.each([undefined, 'full', 'empty'])('accepts not-found %j', (notFound) => {
    const parsed = configSchema.parse({
      template: '$CHANGES',
      replacers: [{ search: 'value', replace: '', 'not-found': notFound }],
    })
    expect(parsed.replacers[0]['not-found']).toBe(notFound)
  })

  it.each(['unknown', '', null, 42])('rejects not-found %j', (notFound) => {
    expect(() =>
      configSchema.parse({
        template: '$CHANGES',
        replacers: [{ search: 'value', replace: '', 'not-found': notFound }],
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
