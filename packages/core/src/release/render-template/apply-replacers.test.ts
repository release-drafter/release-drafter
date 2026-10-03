import { describe, expect, it } from 'vitest'
import { applyReplacers } from './apply-replacers.ts'

describe('applyReplacers', () => {
  it.each(['global', 'change-body', 'change-title'] as const)(
    'applies missing-match fallback only when no match exists for %s',
    (target) => {
      for (const notFound of [undefined, 'full', 'empty'] as const) {
        const replacers = [
          {
            target,
            search: /visible/,
            replace: 'notes',
            'not-found': notFound,
          },
        ]
        expect(applyReplacers('visible', replacers, target)).toBe('notes')
        expect(applyReplacers('missing', replacers, target)).toBe(
          notFound === 'empty' ? '' : 'missing',
        )
      }
    },
  )

  it('counts an empty match as found', () => {
    expect(
      applyReplacers('', [
        { search: /^$/, replace: 'notes', 'not-found': 'empty' },
      ]),
    ).toBe('notes')
  })

  it('does not apply fallback from another target', () => {
    expect(
      applyReplacers('body', [
        {
          target: 'change-body',
          search: /missing/,
          replace: '',
          'not-found': 'empty',
        },
      ]),
    ).toBe('body')
  })

  it('retains the current input on full fallback and continues rules after empty fallback', () => {
    expect(
      applyReplacers('old', [
        { search: /old/, replace: 'new' },
        { search: /missing/, replace: '', 'not-found': 'full' },
      ]),
    ).toBe('new')
    expect(
      applyReplacers('old', [
        { search: /missing/, replace: '', 'not-found': 'empty' },
        { search: /^$/, replace: 'No release notes' },
      ]),
    ).toBe('No release notes')
  })

  it.each(['global', 'change-body', 'change-title'] as const)(
    'isolates sticky regex state for repeated %s inputs',
    (target) => {
      const search = /^old/y
      search.lastIndex = 2
      const replacers = [{ target, search, replace: 'new' }]

      expect(
        ['old', 'old', 'old'].map((input) =>
          applyReplacers(input, replacers, target),
        ),
      ).toEqual(['new', 'new', 'new'])
      expect(search.lastIndex).toBe(2)
    },
  )

  it.each([
    [/old/, 'newold'],
    [/old/g, 'newnew'],
    [/old/y, 'newold'],
    [/old/gy, 'newnew'],
  ] as const)('preserves replacement flags for %s', (search, expected) => {
    const replacers = [{ search, replace: 'new' }]
    expect(applyReplacers('oldold', replacers)).toBe(expected)
    expect(applyReplacers('oldold', replacers)).toBe(expected)
  })

  it('keeps frozen caller-owned regexes usable across repeated inputs', () => {
    const search = /^old/y
    search.lastIndex = 2
    Object.freeze(search)
    const replacers = [
      { target: 'change-body' as const, search, replace: 'new' },
    ]

    expect(applyReplacers('old', replacers, 'change-body')).toBe('new')
    expect(applyReplacers('old', replacers, 'change-body')).toBe('new')
    expect(search.lastIndex).toBe(2)
  })

  it('uses changed source and flags when the caller recompiles a regex', () => {
    const search = /old/
    const replacers = [{ search, replace: 'new' }]

    expect(applyReplacers('old OLD old', replacers)).toBe('new OLD old')
    search.compile('old', 'g')
    expect(applyReplacers('old OLD old', replacers)).toBe('new OLD new')
    search.compile('OLD', 'g')
    expect(applyReplacers('old OLD old', replacers)).toBe('old new old')
  })
})
